// store/slices/orderSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { orderApi } from '../services/orderApi';

// Types
export interface Order {
  order_id: string;
  user_id: string;
  mobile_number: string;
  machine_id: string;
  raw_payload: string;
  decrypted_payload: string;
  bmi_data: {
    height: number;
    weight: number;
    bmi: number;
    machine_id: string;
  };
  test_fee: number;
  order_status: string;
  payment_status: string;
  scan_timestamp: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOrderPayload {
  timestamp: string;
  user_id?: string; // ✅ Optional - will be set later in SelectUser
  raw_payload: string;
  mobile_number: string;
}

export interface CreateOrderResponse {
  order_id: string;
  height: number;
  weight: number;
  bmi: number;
  machine_id: string;
  test_fee: number;
  expires_at: string;
}

export interface OrderState {
  orders: Order[];
  currentOrder: CreateOrderResponse | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  paidOrderIds: string[];
}

// Initial state
const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  lastFetch: null,
  paidOrderIds: [],
};

// Async thunks

/**
 * Create order from QR scan
 */
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (payload: CreateOrderPayload, { rejectWithValue }) => {
    try {
      console.log('📋 Redux: Creating order from QR scan...');
      console.log(
        'User ID:',
        payload.user_id || 'NOT SET - will be set in SelectUser',
      );
      console.log('Mobile:', payload.mobile_number);

      const response = await orderApi.createOrder(payload);

      if (response.success) {
        console.log('✅ Redux: Order created successfully');
        console.log('Order ID:', response.data.order_id);
        console.log('BMI:', response.data.bmi);
        console.log('Fee:', response.data.test_fee);
        return response.data;
      }

      return rejectWithValue(response.message || 'Failed to create order');
    } catch (error: any) {
      console.log('❌ Redux: Error creating order:', error.message);
      return rejectWithValue(
        error.message || 'An error occurred while creating order',
      );
    }
  },
);

/**
 * Fetch order by ID
 */
export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      console.log('📋 Redux: Fetching order:', orderId);
      const response = await orderApi.getOrderById(orderId);

      if (response.success) {
        console.log('✅ Redux: Order fetched successfully');
        return response.data;
      }

      return rejectWithValue(response.message || 'Failed to fetch order');
    } catch (error: any) {
      console.log('❌ Redux: Error fetching order:', error.message);
      return rejectWithValue(
        error.message || 'An error occurred while fetching order',
      );
    }
  },
);

/**
 * Fetch all orders for a user
 */
export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async (userId: string, { rejectWithValue }) => {
    try {
      console.log('📋 Redux: Fetching orders for user:', userId);
      const response = await orderApi.getUserOrders(userId);

      if (response.success) {
        console.log(`✅ Redux: Fetched ${response.count} orders`);
        return response.data;
      }

      return rejectWithValue(response.message || 'Failed to fetch orders');
    } catch (error: any) {
      console.log('❌ Redux: Error fetching user orders:', error.message);
      return rejectWithValue(
        error.message || 'An error occurred while fetching orders',
      );
    }
  },
);

/**
 * Update order with selected user_id
 * Called from SelectUser screen
 */
export const updateOrderUser = createAsyncThunk(
  'orders/updateOrderUser',
  async (
    { orderId, userId }: { orderId: string; userId: string },
    { rejectWithValue },
  ) => {
    try {
      console.log('👤 Redux: Updating order with user_id');
      console.log('Order ID:', orderId);
      console.log('User ID:', userId);

      const response = await orderApi.updateOrderUser(orderId, userId);

      if (response.success) {
        console.log('✅ Redux: Order updated with user_id');
        return { orderId, userId };
      }

      return rejectWithValue(response.message || 'Failed to update order');
    } catch (error: any) {
      console.log('❌ Redux: Error updating order user:', error.message);
      return rejectWithValue(
        error.message || 'An error occurred while updating order',
      );
    }
  },
);

// Slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearCurrentOrder: state => {
      state.currentOrder = null;
    },
    resetOrders: state => {
      state.orders = [];
      state.currentOrder = null;
      state.error = null;
      state.lastFetch = null;
      state.paidOrderIds = [];
    },
    markOrderPaid: (state, action: PayloadAction<{ orderId: string }>) => {
      const { orderId } = action.payload;

      // ✅ FIX 6: Always add to paidOrderIds — even if order not in array yet
      if (!state.paidOrderIds.includes(orderId)) {
        state.paidOrderIds.push(orderId);
      }

      // ✅ FIX 5: Update orders[] if present
      const order = state.orders.find(o => o.order_id === orderId);
      if (order) {
        order.order_status = 'payment_completed';
        order.payment_status = 'paid';
      }

      // Clear currentOrder if matches
      if (state.currentOrder?.order_id === orderId) {
        state.currentOrder = null;
      }
    },
  },
  extraReducers: builder => {
    // Create order
    builder
      .addCase(createOrder.pending, state => {
        console.log('🔄 createOrder: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        createOrder.fulfilled,
        (state, action: PayloadAction<CreateOrderResponse>) => {
          console.log('✅ createOrder: fulfilled');
          state.isLoading = false;
          state.currentOrder = action.payload;
        },
      )
      .addCase(createOrder.rejected, (state, action) => {
        console.log('❌ createOrder: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch order by ID
    builder
      .addCase(fetchOrderById.pending, state => {
        console.log('🔄 fetchOrderById: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchOrderById.fulfilled,
        (state, action: PayloadAction<Order>) => {
          console.log('✅ fetchOrderById: fulfilled');
          state.isLoading = false;
          // Update orders array if order exists, otherwise add it
          const index = state.orders.findIndex(
            o => o.order_id === action.payload.order_id,
          );
          if (index !== -1) {
            state.orders[index] = action.payload;
          } else {
            state.orders.push(action.payload);
          }
        },
      )
      .addCase(fetchOrderById.rejected, (state, action) => {
        console.log('❌ fetchOrderById: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch user orders
    builder
      .addCase(fetchUserOrders.pending, state => {
        console.log('🔄 fetchUserOrders: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchUserOrders.fulfilled,
        (state, action: PayloadAction<Order[]>) => {
          console.log('✅ fetchUserOrders: fulfilled');
          state.isLoading = false;
          state.orders = action.payload;
          state.lastFetch = Date.now();
        },
      )
      .addCase(fetchUserOrders.rejected, (state, action) => {
        console.log('❌ fetchUserOrders: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update order user
    builder
      .addCase(updateOrderUser.pending, state => {
        console.log('🔄 updateOrderUser: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        updateOrderUser.fulfilled,
        (state, action: PayloadAction<{ orderId: string; userId: string }>) => {
          console.log('✅ updateOrderUser: fulfilled');
          state.isLoading = false;
          // Update the order in orders array if it exists
          const order = state.orders.find(
            o => o.order_id === action.payload.orderId,
          );
          if (order) {
            order.user_id = action.payload.userId;
          }
        },
      )
      .addCase(updateOrderUser.rejected, (state, action) => {
        console.log('❌ updateOrderUser: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentOrder, resetOrders, markOrderPaid } =
  orderSlice.actions;
export default orderSlice.reducer;
