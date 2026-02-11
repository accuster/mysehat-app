// store/services/memberApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
// ✅ FIXED: FormData upload now includes network check and proper error handling
import {
  apiClient,
  NetworkError,
  ApiError,
  networkManager,
} from '../../utils/apiClient';
import { storage } from '../../utils/storage';
import axios from 'axios';
import { API_BASE_URL } from '../constant';

// ✅ Types remain the same
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

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string | null;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  profileImage?: string | null;
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
  /**
   * Get all family members
   */
  async getAllMembers(): Promise<Member[]> {
    console.log('📋 Fetching all family members...');

    const response = await apiClient.get<{
      success: boolean;
      count: number;
      members: Member[];
    }>('/members');

    console.log('✅ Members fetched:', response.count);
    return response.members;
  }

  /**
   * Create new family member
   */
  async createMember(data: CreateMemberRequest): Promise<Member> {
    console.log('➕ Creating family member:', data.name);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      member: Member;
    }>('/members', data);

    console.log('✅ Member created:', response.member.id);
    return response.member;
  }

  /**
   * Get member by ID
   */
  async getMemberById(id: string): Promise<Member> {
    console.log('🔍 Fetching member:', id);

    const response = await apiClient.get<{
      success: boolean;
      member: Member;
    }>(`/members/${id}`);

    console.log('✅ Member fetched:', response.member.name);
    return response.member;
  }

  /**
   * Get logged-in user's profile (optimized)
   * Endpoint: GET /api/profile
   */
  async getMyProfile(): Promise<Member> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 API: Fetching my profile');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response = await apiClient.get<{
      success: boolean;
      profile: Member;
    }>('/profile');

    console.log('✅ Profile fetched:', response.profile.name);
    return response.profile;
  }

  /**
   * Update family member
   */
  async updateMember(id: string, data: UpdateMemberRequest): Promise<Member> {
    console.log('✏️ Updating member:', id);

    const response = await apiClient.put<{
      success: boolean;
      message: string;
      member: Member;
    }>(`/members/${id}`, data);

    console.log('✅ Member updated:', response.member.name);
    return response.member;
  }

  /**
   * Delete family member
   */
  async deleteMember(id: string): Promise<void> {
    console.log('🗑️ Deleting member:', id);

    await apiClient.delete(`/members/${id}`);

    console.log('✅ Member deleted');
  }

  /**
   * Update logged-in user's profile with file upload
   * ✅ FIXED: Now includes network check and proper error handling
   * Uses FormData for multipart/form-data upload
   */
  async updateProfile(
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 API: Updating profile with file upload');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ 1. CHECK NETWORK CONNECTIVITY FIRST
    const isOnline = await networkManager.checkConnectivity();
    if (!isOnline) {
      console.log('❌ No internet connection - aborting profile update');
      throw new NetworkError(
        'No internet connection. Please check your WiFi or mobile data.',
        true,
      );
    }

    // ✅ 2. CREATE FORMDATA
    const formData = new FormData();

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

    // Add profile image file
    if (data.profileImage && data.profileImage !== null) {
      const uriParts = data.profileImage.split('/');
      const filename = uriParts[uriParts.length - 1];
      const extension = filename.split('.').pop()?.toLowerCase();

      let mimeType = 'image/jpeg';
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg')
        mimeType = 'image/jpeg';
      else if (extension === 'gif') mimeType = 'image/gif';
      else if (extension === 'webp') mimeType = 'image/webp';

      const file = {
        uri: data.profileImage,
        type: mimeType,
        name: filename || 'profile.jpg',
      } as any;

      formData.append('profileImage', file);
      console.log('📎 Appending image file:', file.name);
    }

    // ✅ 3. GET TOKEN
    const token = await storage.getToken();
    if (!token) {
      console.log('❌ No authentication token found');
      throw new ApiError('No authentication token found', 401, false);
    }

    try {
      // ✅ 4. MAKE REQUEST WITH PROPER ERROR HANDLING
      console.log('📤 Sending profile update request...');
      const response = await axios.put<{
        success: boolean;
        message: string;
        data: UpdateProfileResponse;
      }>(`${API_BASE_URL}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      });

      console.log('✅ Profile updated successfully');
      return response.data.data;
    } catch (error: any) {
      console.log('❌ Profile update failed:', error.message);

      // ✅ 5. HANDLE ERRORS PROPERLY
      if (axios.isAxiosError(error)) {
        // Network error (no response)
        if (!error.response) {
          console.log('⚠️ Network error - no response from server');
          throw new NetworkError(
            'Unable to reach server. Please check your internet connection.',
            true,
          );
        }

        // HTTP error (got response)
        const status = error.response.status;
        const errorData = error.response.data as any; // ✅ RENAMED from 'data' to 'errorData'

        // Extract error message
        const errorMessage =
          errorData?.message ||
          errorData?.error ||
          this.getDefaultErrorMessage(status);

        console.log(`⚠️ HTTP ${status} error:`, errorMessage);
        throw new ApiError(errorMessage, status, status >= 500);
      }

      // Unknown error
      console.log('⚠️ Unknown error type:', error);
      throw new ApiError(
        'An unexpected error occurred. Please try again.',
        undefined,
        false,
      );
    }
  }

  /**
   * Helper: Get default error message based on status code
   */
  private getDefaultErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Your session has expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 413:
        return 'File size too large. Please choose a smaller image.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export const memberApi = new MemberApiService();
