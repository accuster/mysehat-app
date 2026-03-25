// store/index.ts - WITH REDUX PERSIST
import { configureStore, combineReducers } from '@reduxjs/toolkit';
// import { persistStore, persistReducer } from 'redux-persist';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import memberReducer from './slices/memberSlice';
import reportReducer from './slices/reportSlice';
import transactionReducer from './slices/transactionSlice';
import orderReducer from './slices/orderSlice';
import partnerAuthReducer from './slices/partnerAuthSlice';
import paymentReducer from './slices/paymentSlice';
import partnerReducer from './slices/partnerSlice';
import walletReducer from './slices/walletSlice';

// ✅ Redux Persist Configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'members', 'partnerAuth', 'payment'], // ✅ Persist auth, members, partnerAuth and  payment slices
  blacklist: ['reports', 'transactions', 'orders', 'partner', 'wallet'], // ❌ Don't persist (fetch fresh)
};

// ✅ Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  members: memberReducer,
  reports: reportReducer,
  transactions: transactionReducer,
  orders: orderReducer,
  partnerAuth: partnerAuthReducer,
  payment: paymentReducer,
  partner: partnerReducer,
  wallet: walletReducer,
});

// ✅ Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// ✅ Configure store with persisted reducer
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // ✅ Ignore redux-persist actions
        // ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// ✅ Create persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
