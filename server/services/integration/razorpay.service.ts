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
      throw new Error(`Razorpay order creation failed: ${error.message}`);
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
      throw new Error(`Failed to fetch order: ${error.message}`);
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
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }
}

export const razorpayService = new RazorpayService();
