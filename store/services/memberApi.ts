// store/services/memberApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '../constant';


// ✅ UPDATED: Member type with email and profileImage
export interface Member {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  email?: string | null;
  profileImage?: string | null;
  userType: 'SuperUser' | 'FamilyUser';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberRequest {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export interface UpdateMemberRequest {
  name?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
}

// ============================================================================
// ✅ NEW: Profile Update Types with File Support
// ============================================================================
export interface UpdateProfileRequest {
  fullName?: string;
  email?: string | null;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  profileImage?: string | null; // File URI from image picker
}

export interface UpdateProfileResponse {
  userId: string;
  fullName: string;
  email: string | null;
  age: number;
  gender: string;
  profileImage: string | null;
  mobile: string;
  updatedAt: string;
}

class MemberApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased timeout for file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use(
      async config => {
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      },
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        // If token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              // Call refresh token endpoint (from authApi)
              const response = await axios.post(
                `${API_BASE_URL}/wa-auth/refresh-token`,
                {
                  refreshToken,
                },
              );

              const newToken = response.data.accessToken;
              await storage.saveToken(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Get all family members
   */
  async getAllMembers(): Promise<Member[]> {
    try {
      console.log('📋 Fetching all family members...');
      console.log('URL:', `${API_BASE_URL}/members`);

      const response = await this.api.get<{
        success: boolean;
        count: number;
        members: Member[];
      }>('/members');

      console.log('✅ Members fetched:', response.data.count);
      return response.data.members;
    } catch (error: any) {
      console.log('❌ Error fetching members:', error.message);
      console.log('Error details:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Create new family member
   */
  async createMember(data: CreateMemberRequest): Promise<Member> {
    try {
      console.log('➕ Creating family member:', data.name);
      const response = await this.api.post<{
        success: boolean;
        message: string;
        member: Member;
      }>('/members', data);

      console.log('✅ Member created:', response.data.member.id);
      return response.data.member;
    } catch (error: any) {
      console.log('❌ Error creating member:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get member by ID
   */
  async getMemberById(id: string): Promise<Member> {
    try {
      console.log('🔍 Fetching member:', id);
      const response = await this.api.get<{
        success: boolean;
        member: Member;
      }>(`/members/${id}`);

      console.log('✅ Member fetched:', response.data.member.name);
      return response.data.member;
    } catch (error: any) {
      console.log('❌ Error fetching member:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get logged-in user's profile (optimized)
   * Endpoint: GET /api/profile
   */
  async getMyProfile(): Promise<Member> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 API: Fetching my profile');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await this.api.get<{
        success: boolean;
        profile: Member;
      }>('/profile');

      console.log('✅ Profile fetched:', response.data.profile.name);
      return response.data.profile;
    } catch (error: any) {
      console.log('❌ Error fetching profile:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Update family member
   */
  async updateMember(id: string, data: UpdateMemberRequest): Promise<Member> {
    try {
      console.log('✏️ Updating member:', id);
      const response = await this.api.put<{
        success: boolean;
        message: string;
        member: Member;
      }>(`/members/${id}`, data);

      console.log('✅ Member updated:', response.data.member.name);
      return response.data.member;
    } catch (error: any) {
      console.log('❌ Error updating member:', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Delete family member
   */
  async deleteMember(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting member:', id);
      await this.api.delete(`/members/${id}`);
      console.log('✅ Member deleted');
    } catch (error: any) {
      console.log('❌ Error deleting member:', error.message);
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // ✅ NEW: Update Profile with File Upload (FormData)
  // ============================================================================
  /**
   * Update logged-in user's profile
   * Endpoint: PUT /api/profile
   * Uses FormData to upload profile image file
   */
  async updateProfile(
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 API: Updating profile with file upload');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        'Request data:',
        JSON.stringify(
          { ...data, profileImage: data.profileImage ? 'FILE' : null },
          null,
          2,
        ),
      );

      // ✅ Create FormData for multipart/form-data upload
      const formData = new FormData();

      // Add text fields
      if (data.fullName !== undefined) {
        formData.append('fullName', data.fullName);
      }

      if (data.email !== undefined && data.email !== null) {
        formData.append('email', data.email);
      }

      if (data.age !== undefined) {
        formData.append('age', data.age.toString());
      }

      if (data.gender !== undefined) {
        formData.append('gender', data.gender);
      }

      // ✅ Add profile image file (if provided)
      if (data.profileImage && data.profileImage !== null) {
        // Extract filename from URI
        const uriParts = data.profileImage.split('/');
        const filename = uriParts[uriParts.length - 1];

        // Determine MIME type from file extension
        const extension = filename.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg'; // Default

        if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (extension === 'gif') {
          mimeType = 'image/gif';
        } else if (extension === 'webp') {
          mimeType = 'image/webp';
        }

        // ✅ Create file object for upload
        const file = {
          uri: data.profileImage,
          type: mimeType,
          name: filename || 'profile.jpg',
        } as any;

        formData.append('profileImage', file);

        console.log('📎 Appending image file:', {
          name: file.name,
          type: file.type,
          uri: file.uri.substring(0, 50) + '...',
        });
      }

      // Get token for Authorization header
      const token = await storage.getToken();

      console.log('📤 Sending FormData request...');

      // ✅ Send FormData with multipart/form-data
      const response = await axios.put<{
        success: boolean;
        message: string;
        data: UpdateProfileResponse;
      }>(`${API_BASE_URL}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
        timeout: 30000, // 30 second timeout for file upload
      });

      console.log('✅ Profile updated successfully');
      console.log('Updated data:', response.data.data);

      return response.data.data;
    } catch (error: any) {
      console.log('❌ Error updating profile:', error.message);
      console.log('Error details:', error.response?.data);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error(
        'No response from server. Please check your connection.',
      );
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const memberApi = new MemberApiService();
