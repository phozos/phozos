import { useState } from 'react';
import { useApiMutation } from './api-hooks';
import { api } from '@/lib/api-client';
import { useToast } from './use-toast';

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

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  isUpgrade?: boolean;
  originalPrice?: number;
  prorationAmount?: number;
  alreadyPaid?: number;
}

interface VerifyPaymentResponse {
  subscription: any;
  paymentId: string;
}

export interface UpgradeData {
  currentPlanName: string;
  targetPlanName: string;
  originalPrice: number;
  alreadyPaid: number;
  prorationAmount: number;
  currency: string;
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeData, setUpgradeData] = useState<UpgradeData | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    orderResponse: CreateOrderResponse;
    planId: string;
    planName: string;
    userInfo?: any;
  } | null>(null);
  const { toast } = useToast();
  
  const createOrderMutation = useApiMutation<CreateOrderResponse, { planId: string }>(
    async (data: { planId: string }) => {
      const response = await api.post('/api/payment/create-order', data);
      return response as CreateOrderResponse;
    }
  );
  
  const verifyPaymentMutation = useApiMutation<VerifyPaymentResponse, { orderId: string; paymentId: string; signature: string; planId: string }>(
    async (data: { orderId: string; paymentId: string; signature: string; planId: string }) => {
      const response = await api.post('/api/payment/verify', data);
      return response as VerifyPaymentResponse;
    }
  );

  const getUserFriendlyErrorMessage = (error: any): string => {
    const errorCode = error?.code || error?.error;
    const errorMessage = error?.message;

    switch (errorCode) {
      case 'ALREADY_SUBSCRIBED':
        return errorMessage || 'You already have an active subscription. You can only upgrade to higher tier plans.';
      
      case 'PRORATION_NOT_ALLOWED':
        return errorMessage || 'This upgrade is not allowed at this time.';
      
      case 'SAME_PLAN':
        return 'You already have this plan. Please select a different plan to upgrade.';
      
      case 'DOWNGRADE_NOT_ALLOWED':
        return 'Cannot downgrade to a lower tier. Only upgrades to higher tiers are allowed.';
      
      case 'PAYMENT_SIGNATURE_INVALID':
        return 'Payment verification failed. The payment signature is invalid. Please try again or contact support.';
      
      case 'PAYMENT_PLAN_MISMATCH':
        return 'The subscription plan does not match your payment. Please restart the payment process.';
      
      case 'PAYMENT_NOT_CAPTURED':
        return 'Your payment was not completed successfully. Please try again or use a different payment method. If money was deducted, it will be refunded within 5-7 business days.';
      
      case 'PLAN_NOT_FOUND':
        return 'The selected plan is no longer available. Please choose another plan.';
      
      default:
        return errorMessage || 'An error occurred while processing your payment. Please try again or contact support.';
    }
  };

  const openRazorpayCheckout = (orderResponse: CreateOrderResponse, planId: string, planName: string, userInfo?: any) => {
    const { orderId, amount, currency, keyId } = orderResponse;

    const options: RazorpayOptions = {
      key: keyId,
      amount: amount,
      currency: currency,
      order_id: orderId,
      name: 'Phozos Study Abroad',
      description: orderResponse.isUpgrade 
        ? `Upgrade to ${planName} - Lifetime Access` 
        : `Lifetime Access - ${planName}`,
      handler: async (response: any) => {
        try {
          await verifyPaymentMutation.mutateAsync({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            planId: planId,
          });

          toast({
            title: "Payment Successful!",
            description: `Welcome to ${planName}! Your subscription has been activated.`,
            variant: "default",
          });

          window.location.href = '/dashboard?payment=success';
        } catch (error) {
          console.error('Payment verification failed:', error);
          toast({
            title: "Payment Verification Failed",
            description: getUserFriendlyErrorMessage(error),
            variant: "destructive",
          });
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
      toast({
        title: "Payment Failed",
        description: response.error?.description || "Your payment could not be processed. Please try again.",
        variant: "destructive",
      });
      window.location.href = '/dashboard?payment=failed';
    });
  };

  const handleUpgradeConfirm = () => {
    if (!pendingPaymentData) return;
    
    setShowUpgradeDialog(false);
    openRazorpayCheckout(
      pendingPaymentData.orderResponse, 
      pendingPaymentData.planId,
      pendingPaymentData.planName, 
      pendingPaymentData.userInfo
    );
    setPendingPaymentData(null);
    setUpgradeData(null);
  };

  const initiatePayment = async (planId: string, planName: string, userInfo?: {
    name?: string;
    email?: string;
    contact?: string;
  }) => {
    try {
      setIsProcessing(true);

      const orderResponse = await createOrderMutation.mutateAsync({ planId });

      if (orderResponse.isUpgrade && orderResponse.prorationAmount !== undefined) {
        setUpgradeData({
          currentPlanName: 'Current Plan',
          targetPlanName: planName,
          originalPrice: orderResponse.originalPrice || 0,
          alreadyPaid: orderResponse.alreadyPaid || 0,
          prorationAmount: orderResponse.prorationAmount,
          currency: orderResponse.currency,
        });
        setPendingPaymentData({ orderResponse, planId, planName, userInfo });
        setShowUpgradeDialog(true);
        setIsProcessing(false);
      } else {
        openRazorpayCheckout(orderResponse, planId, planName, userInfo);
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Payment initiation failed:', error);
      
      const userFriendlyMessage = getUserFriendlyErrorMessage(error);
      
      toast({
        title: "Payment Initiation Failed",
        description: userFriendlyMessage,
        variant: "destructive",
      });

      if (error?.status === 409 || error?.code === 'ALREADY_SUBSCRIBED') {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      setIsProcessing(false);
    }
  };

  const cancelUpgrade = () => {
    setShowUpgradeDialog(false);
    setPendingPaymentData(null);
    setUpgradeData(null);
    setIsProcessing(false);
  };

  return {
    initiatePayment,
    isProcessing,
    upgradeData,
    showUpgradeDialog,
    handleUpgradeConfirm,
    cancelUpgrade,
  };
}
