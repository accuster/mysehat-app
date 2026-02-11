// store/services/orderApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
import { apiClient } from '../../utils/apiClient';

interface OrderResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

interface CreateOrderPayload {
  timestamp: string;
  user_id?: string; // Optional
  raw_payload: string;
  mobile_number: string;
}

class OrderApiService {
  /**
   * Create order from QR scan
   * POST /api/orders/create
   */
  async createOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
    console.log('📡 API Call: POST /orders/create');
    console.log('User ID:', payload.user_id || 'NOT SET');
    console.log('Mobile:', payload.mobile_number);
    console.log('Payload length:', payload.raw_payload?.length);
    
    // ✅ Convert undefined to null for MySQL compatibility
    const requestData = {
      ...payload,
      user_id: payload.user_id || null,
    };
    
    const response = await apiClient.post<OrderResponse>(
      '/orders/create',
      requestData
    );
    
    console.log('📥 API Response received');
    console.log('Order created:', response.data);
    
    return response;
  }

  /**
   * Get order by ID
   * GET /api/orders/:orderId
   */
  async getOrderById(orderId: string): Promise<OrderResponse> {
    console.log(`📡 API Call: GET /orders/${orderId}`);
    
    const response = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
    
    console.log('📥 API Response received');
    
    return response;
  }

  /**
   * Get all orders for a user
   * GET /api/orders/user/:userId
   */
  async getUserOrders(userId: string): Promise<OrderResponse> {
    console.log(`📡 API Call: GET /orders/user/${userId}`);
    
    const response = await apiClient.get<OrderResponse>(`/orders/user/${userId}`);
    
    console.log('📥 API Response received');
    console.log(`Found ${response.count} orders`);
    
    return response;
  }

  /**
   * Update order with selected user_id
   * PUT /api/orders/:orderId/user
   */
  async updateOrderUser(orderId: string, userId: string): Promise<OrderResponse> {
    console.log(`📡 API Call: PUT /orders/${orderId}/user`);
    console.log('User ID:', userId);
    
    const response = await apiClient.put<OrderResponse>(
      `/orders/${orderId}/user`,
      { user_id: userId }
    );
    
    console.log('📥 API Response received');
    
    return response;
  }
}

export const orderApi = new OrderApiService();