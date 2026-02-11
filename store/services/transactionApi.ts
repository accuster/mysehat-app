// store/services/transactionApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
import { apiClient } from '../../utils/apiClient';

interface TransactionResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

class TransactionApiService {
  /**
   * Get all transactions for authenticated user
   */
  async getAllTransactions(): Promise<TransactionResponse> {
    console.log('📡 API Call: GET /transactions');
    
    const response = await apiClient.get<TransactionResponse>('/transactions');
    
    console.log('📥 API Response received');
    console.log('Transaction count:', response.count);
    
    return response;
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<TransactionResponse> {
    console.log(`📡 API Call: GET /transactions/${transactionId}`);
    
    const response = await apiClient.get<TransactionResponse>(
      `/transactions/${transactionId}`
    );
    
    console.log('📥 API Response received');
    
    return response;
  }
}

export const transactionApi = new TransactionApiService();