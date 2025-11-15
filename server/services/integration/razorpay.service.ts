import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../../config';

export interface RazorpayOrderOptions {
  amount: number;        // in paise (100 paise = 1 INR)
  currency: string;      // "INR"
  receipt: string;       // unique receipt ID
  notes?: Record<string, any>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
  notes?: Record<string, any>;
}

export interface RazorpayRefundOptions {
  paymentId: string;
  amount?: number;
  notes?: Record<string, any>;
  receipt?: string;
}

export interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  receipt: string | null;
  status: string;
  created_at: number;
  notes?: Record<string, any>;
  speed_requested?: string;
  speed_processed?: string;
}

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  /**
   * Create Razorpay order for subscription purchase
   */
  async createOrder(options: RazorpayOrderOptions): Promise<RazorpayOrder> {
    try {
      const order = await this.razorpay.orders.create({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        notes: options.notes,
      });

      return order as RazorpayOrder;
    } catch (error: any) {
      throw new Error(`Razorpay order creation failed: ${error.error?.description || error.statusCode || 'Unknown error'}`);
    }
  }

  /**
   * Fetch order details from Razorpay
   */
  async fetchOrder(orderId: string): Promise<RazorpayOrder> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order as RazorpayOrder;
    } catch (error: any) {
      throw new Error(`Failed to fetch order: ${error.error?.description || error.statusCode || 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature for security
   * Accepts Buffer (raw body) or string
   */
  verifyWebhookSignature(
    webhookBody: Buffer | string,
    signature: string
  ): boolean {
    const bodyString = Buffer.isBuffer(webhookBody) 
      ? webhookBody.toString('utf8') 
      : webhookBody;
    
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(bodyString)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify payment signature after checkout
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch payment details
   */
  async getPaymentDetails(paymentId: string) {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error: any) {
      throw new Error(`Failed to fetch payment: ${error.error?.description || error.statusCode || 'Unknown error'}`);
    }
  }

  /**
   * Initiate a refund for a payment
   * @param options - Refund options including paymentId and optional amount
   * @returns RazorpayRefund object
   */
  async initiateRefund(options: RazorpayRefundOptions): Promise<RazorpayRefund> {
    try {
      const refundData: any = {
        payment_id: options.paymentId,
      };

      if (options.amount !== undefined) {
        refundData.amount = options.amount;
      }

      if (options.notes) {
        refundData.notes = options.notes;
      }

      if (options.receipt) {
        refundData.receipt = options.receipt;
      }

      const refund = await this.razorpay.payments.refund(options.paymentId, refundData);
      
      return refund as RazorpayRefund;
    } catch (error: any) {
      const errorMessage = error.error?.description || error.statusCode || 'Unknown error';
      throw new Error(`Razorpay refund initiation failed: ${errorMessage}`);
    }
  }

  /**
   * Get refund status and details
   * @param refundId - Razorpay refund ID
   * @returns RazorpayRefund object with current status
   */
  async getRefundStatus(refundId: string): Promise<RazorpayRefund> {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund as RazorpayRefund;
    } catch (error: any) {
      const errorMessage = error.error?.description || error.statusCode || 'Unknown error';
      throw new Error(`Failed to fetch refund status: ${errorMessage}`);
    }
  }

  /**
   * Get all refunds for a specific payment
   * @param paymentId - Razorpay payment ID
   * @returns Array of RazorpayRefund objects
   */
  async getPaymentRefunds(paymentId: string): Promise<RazorpayRefund[]> {
    try {
      const refunds = await this.razorpay.payments.fetchMultipleRefund(paymentId);
      return (refunds.items || []) as RazorpayRefund[];
    } catch (error: any) {
      const errorMessage = error.error?.description || error.statusCode || 'Unknown error';
      throw new Error(`Failed to fetch payment refunds: ${errorMessage}`);
    }
  }

  /**
   * Handle refund webhook events
   * @param event - Webhook event object from Razorpay
   * @returns Parsed refund event data
   */
  handleRefundWebhook(event: any): { 
    eventType: string; 
    refund: RazorpayRefund;
    payment: any;
  } {
    try {
      const eventType = event.event;
      const refund = event.payload?.refund?.entity;
      const payment = event.payload?.payment?.entity;

      if (!refund) {
        throw new Error('Invalid refund webhook: missing refund data');
      }

      return {
        eventType,
        refund: refund as RazorpayRefund,
        payment,
      };
    } catch (error: any) {
      throw new Error(`Failed to process refund webhook: ${error.message}`);
    }
  }
}

export const razorpayService = new RazorpayService();
