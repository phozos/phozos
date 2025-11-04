import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../types/auth';
import { razorpayService } from '../services/integration/razorpay.service';
import { userSubscriptionService } from '../services/domain/user-subscription.service';
import { paymentTransactionService } from '../services/domain/payment-transaction.service';
import { subscriptionPlanRepository } from '../repositories/subscription.repository';
import { webhookDeduplicationService } from '../services/infrastructure/webhook-deduplication.service';
import config from '../config';
import crypto from 'crypto';

export class PaymentController extends BaseController {
  /**
   * Create Razorpay order for subscription purchase
   * 
   * @route POST /api/payment/create-order
   * @access Private
   */
  async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.sendError(res, 401, 'AUTH_REQUIRED', 'User not authenticated');
      }

      // Check if user can purchase this plan
      const validation = await userSubscriptionService.canPurchasePlan(userId, planId);
      if (!validation.allowed) {
        return this.sendError(res, 409, 'ALREADY_SUBSCRIBED', validation.reason || 'You already have an active subscription', {
          currentPlan: validation.currentPlan
        });
      }

      // Fetch plan details
      const plan = await subscriptionPlanRepository.findById(planId);
      if (!plan) {
        return this.sendError(res, 404, 'PLAN_NOT_FOUND', 'Plan not found');
      }

      // Convert price to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(parseFloat(plan.price) * 100);

      // Generate unique receipt ID (max 40 chars for Razorpay)
      // Format: timestamp_hash (e.g., 1730668192000_a1b2c3d4e5f6g7h8i9)
      const receiptHash = crypto
        .createHash('md5')
        .update(`${userId}_${planId}`)
        .digest('hex')
        .substring(0, 18);
      const receiptId = `${Date.now()}_${receiptHash}`;

      // Create Razorpay order
      const order = await razorpayService.createOrder({
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: receiptId,
        notes: {
          userId,
          planId,
          planName: plan.name,
          isLifetime: true,
          isUpgrade: validation.requiresUpgrade || false,
        },
      });

      return this.sendSuccess(res, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: config.razorpay.keyId,
        isUpgrade: validation.requiresUpgrade || false,
      });
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.createOrder');
    }
  }

  /**
   * Verify payment and activate subscription
   * 
   * SECURITY: This method validates payment integrity by:
   * 1. Verifying Razorpay signature
   * 2. Fetching order from Razorpay to get original planId
   * 3. Validating planId matches order metadata (prevents plan switching fraud)
   * 4. Validating payment amount matches plan price
   * 
   * @route POST /api/payment/verify
   * @access Private
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, paymentId, signature, planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.sendError(res, 401, 'AUTH_REQUIRED', 'User not authenticated');
      }

      // Step 1: Verify payment signature
      const isValid = razorpayService.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

      if (!isValid) {
        return this.sendError(res, 400, 'INVALID_SIGNATURE', 'Invalid payment signature');
      }

      // Step 2: Fetch order details from Razorpay to get original metadata
      const order = await razorpayService.fetchOrder(orderId);

      // Step 3: Validate planId matches the order metadata (CRITICAL SECURITY CHECK)
      if (!order.notes?.planId || order.notes.planId !== planId) {
        return this.sendError(res, 400, 'PLAN_MISMATCH', 'Plan ID mismatch - payment verification failed');
      }

      // Step 4: Validate userId matches the order metadata
      if (order.notes.userId !== userId) {
        return this.sendError(res, 400, 'USER_MISMATCH', 'User ID mismatch - payment verification failed');
      }

      // Step 5: Fetch plan details to validate amount
      const plan = await subscriptionPlanRepository.findById(planId);
      if (!plan) {
        return this.sendError(res, 404, 'PLAN_NOT_FOUND', 'Plan not found');
      }

      // Step 6: Validate payment amount matches plan price (CRITICAL SECURITY CHECK)
      const expectedAmountInPaise = Math.round(parseFloat(plan.price) * 100);
      if (order.amount !== expectedAmountInPaise) {
        return this.sendError(res, 400, 'AMOUNT_MISMATCH', 'Payment amount mismatch - verification failed');
      }

      // Step 7: Fetch payment details from Razorpay
      const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

      // Step 8: Check if payment was successful
      if (paymentDetails.status !== 'captured') {
        return this.sendError(res, 400, 'PAYMENT_NOT_CAPTURED', 'Payment not captured');
      }

      // Step 9: All validations passed - activate subscription with transaction isolation
      // This uses SERIALIZABLE isolation + row-level locking to prevent race conditions
      // between webhook and manual verification
      const subscription = await paymentTransactionService.createSubscriptionWithLock(
        userId,
        planId,
        orderId,
        paymentId
      );

      return this.sendSuccess(res, {
        subscription,
        paymentId,
      });
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.verifyPayment');
    }
  }

  /**
   * Handle Razorpay webhooks
   * 
   * SECURITY: Webhook signature is computed over raw body bytes.
   * The route must use express.raw() middleware to preserve the raw body.
   * We verify signature first, then parse JSON.
   * 
   * @route POST /api/payment/webhook
   * @access Public (but verified via signature)
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify we received raw body (Buffer) for signature verification
      if (!Buffer.isBuffer(req.body)) {
        console.error('❌ Webhook received parsed body instead of raw Buffer');
        return res.status(400).json({
          error: 'Webhook must receive raw body for signature verification. Check middleware order in server/index.ts'
        });
      }

      const signature = req.headers['x-razorpay-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhook signature'
        });
      }

      // req.body will be a Buffer when using express.raw() middleware
      const webhookBody = req.body;

      // Verify webhook signature (accepts Buffer or string)
      const isValid = razorpayService.verifyWebhookSignature(webhookBody, signature);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }

      // Parse JSON after signature verification
      const bodyString = Buffer.isBuffer(webhookBody) 
        ? webhookBody.toString('utf8') 
        : webhookBody;
      const parsedBody = JSON.parse(bodyString);

      const event = parsedBody.event;
      const payload = parsedBody.payload;
      const eventId = parsedBody.event_id || parsedBody.id;

      // TIMESTAMP VALIDATION: Prevent replay attacks by rejecting old webhooks
      const createdAt = parsedBody.created_at;
      
      if (!createdAt) {
        console.warn('⚠️ [Webhook Security] Webhook missing created_at timestamp - rejecting as invalid');
        return res.status(400).json({
          error: 'WEBHOOK_INVALID',
          message: 'Webhook missing created_at timestamp'
        });
      }

      // Calculate webhook age in seconds (Razorpay created_at is Unix timestamp in seconds)
      const currentTimestamp = Date.now() / 1000; // Convert milliseconds to seconds
      const age = currentTimestamp - createdAt;

      // Reject webhooks older than 5 minutes (300 seconds)
      if (age > 300) {
        console.warn(`⚠️ [Webhook Security] Webhook too old - Age: ${age.toFixed(2)}s, Created: ${new Date(createdAt * 1000).toISOString()}, Current: ${new Date(currentTimestamp * 1000).toISOString()}`);
        return res.status(400).json({
          error: 'WEBHOOK_TOO_OLD',
          message: 'Webhook timestamp too old, possible replay attack'
        });
      }

      console.log(`✅ [Webhook Security] Timestamp validated - Age: ${age.toFixed(2)}s (within 5 minute window)`);

      // DEDUPLICATION: Check if this event has already been processed
      if (!eventId) {
        console.error('❌ Webhook missing event_id:', parsedBody);
        return res.status(400).json({
          success: false,
          message: 'Webhook missing event_id'
        });
      }

      // Check if event already processed
      const isProcessed = await webhookDeduplicationService.isEventProcessed(eventId);
      if (isProcessed) {
        console.log(`✅ [Webhook Deduplication] Event ${eventId} already processed - returning 200 OK (idempotent)`);
        return res.status(200).send('OK');
      }

      // Record new event in database
      await webhookDeduplicationService.recordEvent(eventId, event, parsedBody);

      try {
        // Handle different webhook events
        switch (event) {
          case 'payment.captured':
            await this.handlePaymentCaptured(payload.payment.entity);
            break;

          case 'payment.failed':
            await this.handlePaymentFailed(payload.payment.entity);
            break;

          case 'order.paid':
            await this.handleOrderPaid(payload.order.entity);
            break;

          default:
            console.log(`Unhandled webhook event: ${event}`);
        }

        // Mark event as successfully processed
        await webhookDeduplicationService.markSuccess(eventId);

        // Always respond 200 OK to Razorpay
        return res.status(200).send('OK');
      } catch (processingError) {
        // Mark event as failed with error details
        const errorMessage = processingError instanceof Error 
          ? processingError.message 
          : 'Unknown error during webhook processing';
        
        await webhookDeduplicationService.markFailed(eventId, errorMessage);
        
        console.error('❌ Webhook processing error:', processingError);
        
        // Still return 200 OK to prevent Razorpay retries
        // The event is marked as failed in our database for manual review
        return res.status(200).send('OK');
      }
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).send('Internal server error');
    }
  }

  private async handlePaymentCaptured(payment: any) {
    console.log('Payment captured:', payment.id);
    // Additional logging or processing if needed
  }

  private async handlePaymentFailed(payment: any) {
    console.log('Payment failed:', payment.id);
    // Send notification to user, update subscription status
  }

  private async handleOrderPaid(order: any) {
    console.log('Order paid:', order.id);
    
    try {
      // Extract metadata from order
      const userId = order.notes?.userId;
      const planId = order.notes?.planId;
      const orderId = order.id;

      if (!userId || !planId) {
        console.error('Order paid webhook missing required metadata:', { userId, planId, orderId });
        return;
      }

      // Extract paymentId from order.payments array if available, otherwise use orderId
      // Razorpay order object may include payments array with payment details
      let paymentId = orderId; // Fallback to orderId
      if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
        paymentId = order.payments[0].id;
      }

      // Activate subscription with transaction isolation - prevents race conditions
      // between webhook and manual verification using SERIALIZABLE isolation + row-level locking
      const subscription = await paymentTransactionService.createSubscriptionWithLock(
        userId,
        planId,
        orderId,
        paymentId
      );

      console.log('Subscription activated via webhook:', subscription.id);
    } catch (error) {
      console.error('Error handling order.paid webhook:', error);
    }
  }
}

export const paymentController = new PaymentController();
