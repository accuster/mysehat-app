// store/services/memberApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';

// API Base URL - Same as your auth API
const API_BASE_URL = 'https://sandbox.mysehat.ai/api';

// Member type
export interface Member {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
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

class MemberApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              // Call refresh token endpoint (from authApi)
              const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
                refreshToken,
              });
              
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
      }
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
      console.error('❌ Error fetching members:', error.message);
      console.error('Error details:', error.response?.data);
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
      console.error('❌ Error creating member:', error.message);
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
      console.error('❌ Error fetching member:', error.message);
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
      console.error('❌ Error updating member:', error.message);
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
      console.error('❌ Error deleting member:', error.message);
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
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const memberApi = new MemberApiService();