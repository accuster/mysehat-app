// store/services/partnerApi.ts
import { apiClient } from '../../utils/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportFilters {
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface PartnerProfile {
  // auth table
  auth_id: string;
  username: string;
  email: string;
  mobile_number: string | null;
  role: string;
  status: string;
  created_date: string;
  // organizations table
  org_id: string | null;
  org_name: string | null;
  owner_name: string | null;
  org_phone: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  revenue_share: number | null;
  pan_gst: string | null;
  org_image: string | null;
  fee_edit: number | null;
  // auth_profiles table
  full_name: string | null;
  profile_image: string | null;
}

export interface UpdateProfileRequest {
  username?: string;
  mobile_number?: string;
  full_name?: string;
  profile_image?: string;
  currentPassword?: string;
  newPassword?: string;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface PartnerReport {
  report_id: string;
  report_date: string;
  height: number;
  weight: number;
  bmi: number;
  bmi_status: 'Normal' | 'Underweight' | 'Overweight' | 'Obese';
  ideal_weight: number | null;
  body_fat_pct: number | null;
  fat_mass: number | null;
  lean_body_mass: number | null;
  health_score: number | null;
  fee: number | null;
  payment_method: string | null;
  transaction_id: string | null;
  // user
  user_id: string | null;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  mobile_number: string | null;
  // machine
  machine_id: string;
  machine_location: string | null;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface PartnerTransaction {
  order_id: string;
  mobile_number: string;
  machine_id: string;
  test_fee: number;
  payment_gateway: string | null;
  payment_method: string | null;
  payment_id: string | null;
  payment_status: string;
  order_status: string;
  report_id: string | null;
  payment_completed_at: string | null;
  scan_timestamp: string;
  machine_location: string | null;
  // only in getById
  bmi_data?: any;
  error_message?: string | null;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

interface ProfileResponse {
  success: boolean;
  profile: PartnerProfile;
}

interface UpdateProfileResponse {
  success: boolean;
  message: string;
}

interface ReportsResponse {
  success: boolean;
  pagination: PaginationMeta;
  reports: PartnerReport[];
}

interface ReportByIdResponse {
  success: boolean;
  report: PartnerReport;
}

interface TransactionsResponse {
  success: boolean;
  pagination: PaginationMeta;
  transactions: PartnerTransaction[];
}

interface TransactionByIdResponse {
  success: boolean;
  transaction: PartnerTransaction;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class PartnerApiService {

  /**
   * GET /api/v1/partner/profile/:id
   */
  async getProfile(authId: string): Promise<ProfileResponse> {
    console.log('👤 PartnerAPI: getProfile →', authId);
    const response = await apiClient.get<ProfileResponse>(
      `/partner/profile/${authId}`,
    );
    console.log('✅ PartnerAPI: getProfile success');
    return response;
  }

  /**
   * PUT /api/v1/partner/profile/:id
   */
  async updateProfile(
    authId: string,
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    console.log('✏️ PartnerAPI: updateProfile →', authId);
    const response = await apiClient.put<UpdateProfileResponse>(
      `/partner/profile/${authId}`,
      data,
    );
    console.log('✅ PartnerAPI: updateProfile success');
    return response;
  }

  /**
   * GET /api/v1/partner/reports
   * Supports: page, limit, from (YYYY-MM-DD), to (YYYY-MM-DD)
   */
  async getReports(filters: ReportFilters = {}): Promise<ReportsResponse> {
    console.log('📋 PartnerAPI: getReports →', filters);
    const params = new URLSearchParams();
    if (filters.page)  params.append('page',  String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.from)  params.append('from',  filters.from);
    if (filters.to)    params.append('to',    filters.to);

    const url = `/partner/reports${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiClient.get<ReportsResponse>(url);
    console.log('✅ PartnerAPI: getReports success — total:', response.pagination?.total);
    return response;
  }

  /**
   * GET /api/v1/partner/reports/:id
   */
  async getReportById(reportId: string): Promise<ReportByIdResponse> {
    console.log('📄 PartnerAPI: getReportById →', reportId);
    const response = await apiClient.get<ReportByIdResponse>(
      `/partner/reports/${reportId}`,
    );
    console.log('✅ PartnerAPI: getReportById success');
    return response;
  }

  /**
   * GET /api/v1/partner/transactions
   * Supports: page, limit, from (YYYY-MM-DD), to (YYYY-MM-DD)
   */
  async getTransactions(filters: TransactionFilters = {}): Promise<TransactionsResponse> {
    console.log('💳 PartnerAPI: getTransactions →', filters);
    const params = new URLSearchParams();
    if (filters.page)  params.append('page',  String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.from)  params.append('from',  filters.from);
    if (filters.to)    params.append('to',    filters.to);

    const url = `/partner/transactions${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiClient.get<TransactionsResponse>(url);
    console.log('✅ PartnerAPI: getTransactions success — total:', response.pagination?.total);
    return response;
  }

  /**
   * GET /api/v1/partner/transactions/:id
   */
  async getTransactionById(orderId: string): Promise<TransactionByIdResponse> {
    console.log('🔍 PartnerAPI: getTransactionById →', orderId);
    const response = await apiClient.get<TransactionByIdResponse>(
      `/partner/transactions/${orderId}`,
    );
    console.log('✅ PartnerAPI: getTransactionById success');
    return response;
  }
}

export const partnerApi = new PartnerApiService();