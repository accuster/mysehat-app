// types/auth.types.ts 
export interface User {
  userId: string;
  mobile: string;
  name: string | null;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  userType: 'SuperUser' | 'FamilyUser';
  isNewUser: boolean;
  requiresProfileSetup: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpSent: boolean;
}

// ✅ CORRECTED: Match actual backend response structure
export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;         // ← Direct property, not nested
  refreshToken: string;         // ← Direct property, not nested
  requiresProfileSetup: boolean;
  user: {
    user_id: string;
    mobile_number: string;
    full_name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    user_type: 'SuperUser' | 'FamilyUser';
  };
  familyMembers: any[];
}

export interface CompleteProfileRequest {
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export interface CompleteProfileResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    mobile: string;
    fullName: string;
    age: number;
    gender: string;
  };
}

export interface WalletInfo {
  wallet_id: string;
  balance: number;
  recent_transactions: Transaction[];
}

export interface Transaction {
  transaction_id: string;
  transaction_type: string;
  credits: number;
  balance_after: number;
  razorpay_payment_id?: string;
  amount_paid?: number;
  description: string;
  created_at: string;
}

export interface FamilyMember {
  user_id: string;
  mobile_number: string;
  full_name: string;
  age: number;
  gender: string;
  user_type: 'FamilyUser';
  created_at: string;
  updated_at: string;
}