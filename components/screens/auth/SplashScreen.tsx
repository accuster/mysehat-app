// components/screens/auth/SplashScreen.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, StatusBar, Image } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  // ✅ Add isMounted ref (low priority but good practice)
  const isMounted = useRef(true);
  
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    isMounted.current = true;
    
    console.log('🚀 SplashScreen: Component mounted');
    
    const timer = setTimeout(() => {
      // ✅ Check if mounted before navigation
      if (!isMounted.current) {
        console.log('⚠️ SplashScreen unmounted before navigation');
        return;
      }
      
      console.log('🔍 SplashScreen: Checking auth state...');
      console.log('User:', user ? user.userId : 'null');
      console.log('isAuthenticated:', isAuthenticated);
      
      if (isAuthenticated && user) {
        console.log('✅ User is authenticated, navigating to App');
        navigation.replace("App");
      } else {
        console.log('❌ User not authenticated, navigating to Auth');
        navigation.replace("Auth");
      }
    }, 1200);

    return () => {
      console.log('🧹 SplashScreen: Unmounting...');
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [navigation, user, isAuthenticated]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Image
        source={require("../../../assets/images/mysehat_logo.png")}
        style={styles.logo}
        resizeMode="contain"
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
});