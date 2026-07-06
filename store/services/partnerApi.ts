// store/services/partnerApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_API_BASE_URL } from '../constant';
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
  to?: string; // YYYY-MM-DD
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  machineId?: string;
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

interface UpdateAvatarResponse {
  success: boolean;
  message: string;
  profile_image: string;
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
   * PUT /api/v1/partner/avatar  (on admin.mysehat.ai)
   *
   * Uploads a new profile image to admin.mysehat.ai and updates
   * organizations.profile_image column via partner JWT.
   *
   * @param imageUri Local file URI from image picker (must start with file://)
   */
  async updateAvatar(imageUri: string): Promise<UpdateAvatarResponse> {
    console.log('🖼️  PartnerAPI: updateAvatar →', imageUri);

    if (!imageUri.startsWith('file://')) {
      throw new Error('Invalid image URI — must be a local file');
    }

    // Extract filename + guess mime type
    const filename = imageUri.split('/').pop() || `avatar_${Date.now()}.jpg`;
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Get partner token (manually — apiClient can't be reused for this)
    const partnerToken = await AsyncStorage.getItem('partner_token');
    if (!partnerToken) {
      throw new Error('Partner not authenticated');
    }

    // Build multipart FormData
    const formData = new FormData();
    formData.append('profileImage', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    const url = `${ADMIN_API_BASE_URL}/partner/avatar`;
    console.log('📤 Uploading to:', url);

    // Direct fetch — bypass apiClient because:
    //   1. Different base URL (admin.mysehat.ai vs app.mysehat.ai)
    //   2. FormData needs auto Content-Type with boundary
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${partnerToken}`,
        // ⚠️ DO NOT set Content-Type — RN sets multipart boundary automatically
      },
      body: formData,
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.log('❌ Non-JSON response:', responseText.slice(0, 200));
      throw new Error('Server returned invalid response');
    }

    if (!response.ok) {
      console.log('❌ Avatar upload failed:', data);
      throw new Error(
        data?.message || `Upload failed (status ${response.status})`,
      );
    }

    console.log('✅ Avatar uploaded:', data.profile_image);
    return data as UpdateAvatarResponse;
  }

  /**
   * GET /api/v1/partner/reports
   * ✅ UPDATED: Added default limit of 30 for pagination
   * Supports: page, limit, from (YYYY-MM-DD), to (YYYY-MM-DD)
   */
  async getReports(filters: ReportFilters = {}): Promise<ReportsResponse> {
    console.log('📋 PartnerAPI: getReports →', filters);
    const params = new URLSearchParams();

    // ✅ Default to page 1, limit 30 (sweet spot for mobile)
    params.append('page', filters.page?.toString() || '1');
    params.append('limit', filters.limit?.toString() || '30');

    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);

    const url = `/partner/reports${
      params.toString() ? '?' + params.toString() : ''
    }`;
    const response = await apiClient.get<ReportsResponse>(url);
    console.log(
      `✅ PartnerAPI: getReports success — page ${response.pagination.page}/${response.pagination.totalPages} — loaded: ${response.reports.length}, total: ${response.pagination.total}`,
    );
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
  async getTransactions(
    filters: TransactionFilters = {},
  ): Promise<TransactionsResponse> {
    console.log('💳 PartnerAPI: getTransactions →', filters);

    const params = new URLSearchParams();

    // ✅ Default to page 1, limit 30 (sweet spot for mobile)
    params.append('page', filters.page?.toString() || '1');
    params.append('limit', filters.limit?.toString() || '30');

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.machineId) params.append('machineId', filters.machineId);

    const url = `/partner/transactions${params.toString() ? `?${params}` : ''}`;
    const response = await apiClient.get<TransactionsResponse>(url);

    console.log(
      `✅ PartnerAPI: getTransactions success — page ${response.pagination.page}/${response.pagination.totalPages} — loaded: ${response.transactions.length}, total: ${response.pagination.total}`,
    );
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
