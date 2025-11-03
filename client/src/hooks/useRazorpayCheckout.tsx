import { useState } from 'react';
import { useApiMutation } from './api-hooks';
import { api } from '@/lib/api-client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createOrderMutation = useApiMutation(
    async (data: { planId: string }) => {
      return await api.post('/api/payment/create-order', data);
    }
  );
  
  const verifyPaymentMutation = useApiMutation(
    async (data: { orderId: string; paymentId: string; signature: string; planId: string }) => {
      return await api.post('/api/payment/verify', data);
    }
  );

  const initiatePayment = async (planId: string, planName: string, userInfo?: {
    name?: string;
    email?: string;
    contact?: string;
  }) => {
    try {
      setIsProcessing(true);

      // Step 1: Create Razorpay order
      const orderResponse = await createOrderMutation.mutateAsync({ planId });
      const { orderId, amount, currency, keyId } = orderResponse.data;

      // Step 2: Open Razorpay checkout
      const options: RazorpayOptions = {
        key: keyId,
        amount: amount,
        currency: currency,
        order_id: orderId,
        name: 'Phozos Study Abroad',
        description: `Lifetime Access - ${planName}`,
        handler: async (response: any) => {
          // Step 3: Verify payment on server
          try {
            await verifyPaymentMutation.mutateAsync({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId: planId,
            });

            // Payment successful
            window.location.href = '/dashboard?payment=success';
          } catch (error) {
            console.error('Payment verification failed:', error);
            window.location.href = '/dashboard?payment=failed';
          }
        },
        prefill: userInfo,
        theme: {
          color: '#6366f1',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        window.location.href = '/dashboard?payment=failed';
      });
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    initiatePayment,
    isProcessing,
  };
}
