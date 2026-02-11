// store/services/reportApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
import { apiClient } from '../../utils/apiClient';

interface ReportResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

class ReportApiService {
  /**
   * Get all reports for authenticated user
   */
  async getAllReports(): Promise<ReportResponse> {
    console.log('📡 API Call: GET /reports');
    
    const response = await apiClient.get<ReportResponse>('/reports');
    
    console.log('📥 API Response received');
    return response;
  }

  /**
   * Get single report by ID
   */
  async getReportById(reportId: string): Promise<ReportResponse> {
    console.log(`📡 API Call: GET /reports/${reportId}`);
    
    const response = await apiClient.get<ReportResponse>(`/reports/${reportId}`);
    
    console.log('📥 API Response received');
    return response;
  }
}

export const reportApi = new ReportApiService();