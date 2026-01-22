// components/navigation/AuthNavigator.tsx
// ✅ IMPROVED VERSION - Consistent with AppNavigator
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // ✅ Enable gesture navigation by default
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          // ✅ Disable gesture on login to prevent accidental back
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="CompleteProfile" 
        component={CompleteProfileScreen}
        options={{
          // ✅ Enable gesture to allow back to login if needed
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}