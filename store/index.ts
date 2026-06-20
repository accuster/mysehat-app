// store/index.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createTransform,
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
import bluetoothReducer, { BluetoothState } from './slices/bluetoothSlice';
import partnerWalletReducer from './slices/partnerWalletSlice';
import machineRechargeReducer from './slices/machineRechargeSlice';

// Only these 5 fields are saved to disk — everything else is session-only.
type PersistedBluetoothState = Pick<
  BluetoothState,
  | 'lastConnectedDevice'
  | 'autoReconnect'
  | 'preferredDevices'
  | 'connectionHistory'
  | 'disconnectCount'
>;

const bluetoothPersistTransform = createTransform<
  BluetoothState,
  PersistedBluetoothState
>(
  // inbound: state → disk. Only save permanent fields.
  inboundState => ({
    lastConnectedDevice: inboundState.lastConnectedDevice,
    autoReconnect: inboundState.autoReconnect,
    preferredDevices: inboundState.preferredDevices,
    connectionHistory: inboundState.connectionHistory,
    disconnectCount: inboundState.disconnectCount,
  }),
  // outbound: disk → state. Session fields always reset, durable fields read from disk.
  outboundState => ({
    isConnected: false,
    isConnecting: false,
    currentDevice: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    lastDisconnectTime: null,
    lastConnectedDevice: outboundState?.lastConnectedDevice ?? null,
    autoReconnect: outboundState?.autoReconnect ?? true,
    preferredDevices: outboundState?.preferredDevices ?? [],
    connectionHistory: outboundState?.connectionHistory ?? [],
    disconnectCount: outboundState?.disconnectCount ?? 0,
  }),
  { whitelist: ['bluetooth'] },
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'members', 'partnerAuth', 'payment', 'bluetooth'],
  blacklist: ['reports', 'transactions', 'orders', 'partner', 'wallet', 'partnerWallet', 'machineRecharge'],
  transforms: [bluetoothPersistTransform],
};

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
  partnerWallet: partnerWalletReducer,
  machineRecharge: machineRechargeReducer,
  bluetooth: bluetoothReducer,
});

const persistedReducer = persistReducer(
  persistConfig,
  rootReducer as any,
) as typeof rootReducer;

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
