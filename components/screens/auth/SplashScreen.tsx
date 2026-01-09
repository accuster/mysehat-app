// SplashScreen.tsx - WITH REDUX PERSIST AUTH CHECK
import React, { useEffect } from "react";
import { View, StyleSheet, StatusBar, Image } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  // ✅ Get auth state from Redux (will be restored by Redux Persist)
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🔍 SplashScreen: Checking auth state...');
      console.log('User:', user ? user.userId : 'null');
      console.log('isAuthenticated:', isAuthenticated);
      
      // ✅ Navigate based on auth state
      if (isAuthenticated && user) {
        console.log('✅ User is authenticated, navigating to App');
        navigation.replace("App");
      } else {
        console.log('❌ User not authenticated, navigating to Auth');
        navigation.replace("Auth");
      }
    }, 1200); // Keep the 1.2s delay for UX

    return () => clearTimeout(timer);
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