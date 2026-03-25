// components/screens/auth/SplashScreencpoy.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, StatusBar, Image, ActivityIndicator } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../../store";
import { forceLogoutOnSessionExpired } from "../../../store/slices/authSlice";
import { apiClient } from "../../../utils/apiClient";

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  const isMounted = useRef(true);
  const dispatch = useDispatch<AppDispatch>();
  
  const { user, isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    isMounted.current = true;
    
    console.log('🚀 SplashScreen: Component mounted');
    
    const checkAuthAndNavigate = async () => {
      try {
        if (!isMounted.current) return;
        
        console.log('🔍 SplashScreen: Checking auth state...');
        console.log('User:', user ? user.userId : 'null');
        console.log('isAuthenticated:', isAuthenticated);
        console.log('Has token:', !!token);
        
        if (isAuthenticated && user && token) {
          console.log('✅ User has auth data - validating token...');
          
          // ✅ NEW: Try to validate token by making a simple API call
          try {
            // This will trigger token refresh if expired
            await apiClient.get('/wa-auth/validate'); // ✅ ADD THIS ENDPOINT IN BACKEND
            
            if (!isMounted.current) return;
            
            console.log('✅ Token is valid, navigating to App');
            navigation.replace("App");
          } catch (error: any) {
            // Token is invalid or expired
            console.log('❌ Token validation failed:', error.message);
            
            if (!isMounted.current) return;
            
            // Force logout and go to Auth
            await dispatch(forceLogoutOnSessionExpired());
            navigation.replace("Auth");
          }
        } else {
          console.log('❌ User not authenticated, navigating to Auth');
          
          if (!isMounted.current) return;
          navigation.replace("Auth");
        }
      } catch (error) {
        console.log('❌ SplashScreen error:', error);
        
        if (!isMounted.current) return;
        navigation.replace("Auth");
      }
    };

    // Add delay for splash screen visibility
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 1200);

    return () => {
      console.log('🧹 SplashScreen: Unmounting...');
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [navigation, user, isAuthenticated, token, dispatch]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Image
        source={require("../../../assets/images/mysehat_logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator 
        size="large" 
        color="#F59E0B" 
        style={styles.loader} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 240,
    height: 80,
  },
  loader: {
    marginTop: 30,
  },
});