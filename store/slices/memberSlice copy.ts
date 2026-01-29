// store/slices/memberSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  memberApi, 
  Member, 
  CreateMemberRequest, 
  UpdateMemberRequest,
  UpdateProfileRequest, 
} from '../services/memberApi';

// ✅ UPDATED: Member state interface with profile update state
export interface MemberState {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  selectedMember: Member | null;
  // ✅ NEW: Profile update state
  isUpdatingProfile: boolean;
  profileUpdateError: string | null;
}

// Initial state
const initialState: MemberState = {
  members: [],
  isLoading: false,
  error: null,
  selectedMember: null,
  // ✅ NEW
  isUpdatingProfile: false,
  profileUpdateError: null,
};

// Async thunks

/**
 * Fetch all family members
 */
export const fetchMembers = createAsyncThunk(
  'members/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Redux: Fetching members');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const members = await memberApi.getAllMembers();
      
      console.log('✅ Members fetched:', members.length);
      return members;
    } catch (error: any) {
      console.log('❌ Error in fetchMembers:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Create new family member
 */
export const createMember = createAsyncThunk(
  'members/create',
  async (data: CreateMemberRequest, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('➕ Redux: Creating member');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Data:', data);
      
      const member = await memberApi.createMember(data);
      
      console.log('✅ Member created:', member.id);
      return member;
    } catch (error: any) {
      console.log('❌ Error in createMember:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update family member
 */
export const updateMember = createAsyncThunk(
  'members/update',
  async ({ id, data }: { id: string; data: UpdateMemberRequest }, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✏️ Redux: Updating member');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', id);
      console.log('Data:', data);
      
      const member = await memberApi.updateMember(id, data);
      
      console.log('✅ Member updated:', member.id);
      return member;
    } catch (error: any) {
      console.log('❌ Error in updateMember:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Delete family member
 */
export const deleteMember = createAsyncThunk(
  'members/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🗑️ Redux: Deleting member');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', id);
      
      await memberApi.deleteMember(id);
      
      console.log('✅ Member deleted');
      return id;
    } catch (error: any) {
      console.log('❌ Error in deleteMember:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// ============================================================================
// ✅ NEW: Update Profile Thunk
// ============================================================================
/**
 * Update logged-in user's profile (SuperUser)
 * Handles: fullName, email, age, gender, profileImage
 */
export const updateProfile = createAsyncThunk(
  'members/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue, dispatch }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Redux: Updating Profile');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Update data:', data);
      
      const updatedProfile = await memberApi.updateProfile(data);
      
      console.log('✅ Profile updated successfully');
      console.log('Updated profile:', updatedProfile);
      
      // ✅ After successful profile update, refresh members list
      // This ensures SuperUser in members list is updated
      console.log('🔄 Refreshing members list...');
      await dispatch(fetchMembers());
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PROFILE UPDATE COMPLETED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return updatedProfile;
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ ERROR IN PROFILE UPDATE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const memberSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.profileUpdateError = null; // ✅ Clear profile error too
    },
    setSelectedMember: (state, action: PayloadAction<Member | null>) => {
      state.selectedMember = action.payload;
    },
    clearMembers: (state) => {
      state.members = [];
      state.error = null;
      state.selectedMember = null;
      state.profileUpdateError = null; // ✅ Clear profile error
    },
  },
  extraReducers: (builder) => {
    // Fetch Members
    builder
      .addCase(fetchMembers.pending, (state) => {
        console.log('🔄 fetchMembers: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        console.log('✅ fetchMembers: fulfilled');
        state.isLoading = false;
        state.members = action.payload;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        console.log('❌ fetchMembers: rejected');
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Member
    builder
      .addCase(createMember.pending, (state) => {
        console.log('🔄 createMember: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMember.fulfilled, (state, action) => {
        console.log('✅ createMember: fulfilled');
        state.isLoading = false;
        state.members.push(action.payload);
      })
      .addCase(createMember.rejected, (state, action) => {
        console.log('❌ createMember: rejected');
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Member
    builder
      .addCase(updateMember.pending, (state) => {
        console.log('🔄 updateMember: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        console.log('✅ updateMember: fulfilled');
        state.isLoading = false;
        const index = state.members.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.members[index] = action.payload;
        }
        if (state.selectedMember?.id === action.payload.id) {
          state.selectedMember = action.payload;
        }
      })
      .addCase(updateMember.rejected, (state, action) => {
        console.log('❌ updateMember: rejected');
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Member
    builder
      .addCase(deleteMember.pending, (state) => {
        console.log('🔄 deleteMember: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMember.fulfilled, (state, action) => {
        console.log('✅ deleteMember: fulfilled');
        state.isLoading = false;
        state.members = state.members.filter(m => m.id !== action.payload);
        if (state.selectedMember?.id === action.payload) {
          state.selectedMember = null;
        }
      })
      .addCase(deleteMember.rejected, (state, action) => {
        console.log('❌ deleteMember: rejected');
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ============================================================================
    // ✅ NEW: Update Profile Reducers
    // ============================================================================
    builder
      .addCase(updateProfile.pending, (state) => {
        console.log('🔄 updateProfile: pending');
        state.isUpdatingProfile = true;
        state.profileUpdateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        console.log('✅ updateProfile: fulfilled');
        state.isUpdatingProfile = false;
        
        // ✅ Update SuperUser in members array with new data
        const superUserIndex = state.members.findIndex(m => m.userType === 'SuperUser');
        if (superUserIndex !== -1) {
          state.members[superUserIndex] = {
            ...state.members[superUserIndex],
            name: action.payload.fullName,
            email: action.payload.email,
            age: action.payload.age,
            gender: action.payload.gender as 'Male' | 'Female' | 'Other',
            profileImage: action.payload.profileImage,
          };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        console.log('❌ updateProfile: rejected');
        console.log('Error:', action.payload);
        state.isUpdatingProfile = false;
        state.profileUpdateError = action.payload as string;
      });
  },
});

export const { clearError, setSelectedMember, clearMembers } = memberSlice.actions;
export default memberSlice.reducer;