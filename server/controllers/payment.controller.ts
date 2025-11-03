import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../types/auth';
import { razorpayService } from '../services/integration/razorpay.service';
import { userSubscriptionService } from '../services/domain/user-subscription.service';
import { subscriptionPlanRepository } from '../repositories/subscription.repository';

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
        return this.sendErrorResponse(res, 'User not authenticated', 401);
      }

      // Fetch plan details
      const plan = await subscriptionPlanRepository.findById(planId);
      if (!plan) {
        return this.sendErrorResponse(res, 'Plan not found', 404);
      }

      // Convert price to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(parseFloat(plan.price) * 100);

      // Create Razorpay order
      const order = await razorpayService.createOrder({
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: `receipt_${userId}_${planId}_${Date.now()}`,
        notes: {
          userId,
          planId,
          planName: plan.name,
          isLifetime: true,
        },
      });

      return this.sendSuccessResponse(res, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Send to frontend for checkout
      }, 'Order created successfully');
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.createOrder');
    }
  }

  /**
   * Verify payment and activate subscription
   * 
   * @route POST /api/payment/verify
   * @access Private
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, paymentId, signature, planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.sendErrorResponse(res, 'User not authenticated', 401);
      }

      // Verify signature
      const isValid = razorpayService.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

      if (!isValid) {
        return this.sendErrorResponse(res, 'Invalid payment signature', 400);
      }

      // Fetch payment details from Razorpay
      const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

      // Check if payment was successful
      if (paymentDetails.status !== 'captured') {
        return this.sendErrorResponse(res, 'Payment not captured', 400);
      }

      // Activate subscription
      const subscription = await userSubscriptionService.subscribeUserToPlan(
        userId,
        planId
      );

      // Update subscription with payment reference
      await userSubscriptionService.updateSubscription(subscription.id, {
        paymentReference: paymentId,
        paymentGateway: 'razorpay',
        status: 'active',
      });

      return this.sendSuccessResponse(res, {
        subscription,
        paymentId,
      }, 'Payment verified and subscription activated');
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.verifyPayment');
    }
  }

  /**
   * Handle Razorpay webhooks
   * 
   * @route POST /api/payment/webhook
   * @access Public (but verified via signature)
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const webhookBody = JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = razorpayService.verifyWebhookSignature(webhookBody, signature);

      if (!isValid) {
        return this.sendErrorResponse(res, 'Invalid webhook signature', 400);
      }

      const event = req.body.event;
      const payload = req.body.payload;

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

      // Always respond 200 OK to Razorpay
      return res.status(200).send('OK');
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
    // Update order status in database if tracked separately
  }
}

export const paymentController = new PaymentController();
