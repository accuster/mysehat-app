// store/services/paymentApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
import { apiClient } from '../../utils/apiClient';

interface PaymentResponse {
  success: boolean;
  message?: string;
  data: any;
}

interface CreatePaymentData {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  order_id: string;
  test_fee: number;
}

interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentApiService {
  /**
   * Create Razorpay payment order
   * POST /api/orders/:orderId/create-payment
   */
  async createPayment(orderId: string): Promise<PaymentResponse> {
    console.log(`📡 API Call: POST /orders/${orderId}/create-payment`);
    
    const response = await apiClient.post<PaymentResponse>(
      `/orders/${orderId}/create-payment`
    );
    
    console.log('📥 API Response received');
    console.log('Razorpay Order ID:', response.data?.razorpay_order_id);
    
    return response;
  }

  /**
   * Verify Razorpay payment
   * POST /api/orders/:orderId/verify-payment
   */
  async verifyPayment(
    orderId: string,
    paymentData: VerifyPaymentData
  ): Promise<PaymentResponse> {
    console.log(`📡 API Call: POST /orders/${orderId}/verify-payment`);
    console.log('Payment data:', {
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      signature: paymentData.razorpay_signature.substring(0, 20) + '...',
    });
    
    const response = await apiClient.post<PaymentResponse>(
      `/orders/${orderId}/verify-payment`,
      paymentData
    );
    
    console.log('📥 API Response received');
    console.log('Payment verified:', response.success);
    console.log('Report ID:', response.data?.report_id);
    
    return response;
  }
}

export const paymentApi = new PaymentApiService();
export type { CreatePaymentData, VerifyPaymentData };