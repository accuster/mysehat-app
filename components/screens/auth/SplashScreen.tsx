// components/screens/auth/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { forceLogoutOnSessionExpired } from '../../../store/slices/authSlice';
import {
  partnerLogout,
  loadPartnerFromStorage,        // ✅ NEW: fallback loader
} from '../../../store/slices/partnerAuthSlice';
import { partnerAuthApi } from '../../../store/services/partnerAuthApi';
import {
  apiClient,
  NetworkError,
} from '../../../utils/apiClient';

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  const isMounted = useRef(true);
  const dispatch  = useAppDispatch();

  // ✅ Both auth states from Redux (rehydrated by redux-persist)
  const {
    user,
    isAuthenticated: isUserAuth,
    token: userToken,
  } = useAppSelector(s => s.auth);

  const {
    isAuthenticated: isPartnerAuth,
    token: partnerToken,
    partner,
  } = useAppSelector(s => s.partnerAuth);

  useEffect(() => {
    isMounted.current = true;
    console.log('🚀 SplashScreen: Component mounted');

    const checkAuthAndNavigate = async () => {
      try {
        if (!isMounted.current) return;

        console.log('🔍 SplashScreen: Checking auth state...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(
          '👤 User    → isAuthenticated:', isUserAuth,
          '| hasToken:', !!userToken,
        );
        console.log(
          '🤝 Partner → isAuthenticated:', isPartnerAuth,
          '| hasToken:', !!partnerToken,
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // ── 1. Partner session check ──────────────────────────────────────
        //
        // PRIMARY:  Redux state (normal launch — persist rehydrated)
        // FALLBACK: AsyncStorage direct read (cache cleared — persist wiped)
        //           loadPartnerFromStorage reads 'partner_token' etc. directly
        //
        let resolvedPartnerToken  = partnerToken;
        let resolvedPartnerInfo   = partner;
        let resolvedIsPartnerAuth = isPartnerAuth;

        if (!resolvedIsPartnerAuth || !resolvedPartnerToken || !resolvedPartnerInfo) {
          console.log('🔄 Redux partner state empty — checking AsyncStorage fallback...');

          const loadResult = await dispatch(loadPartnerFromStorage());

          if (loadPartnerFromStorage.fulfilled.match(loadResult)) {
            // ✅ Found in AsyncStorage — use these values
            resolvedPartnerToken  = loadResult.payload.token;
            resolvedPartnerInfo   = loadResult.payload.partner;
            resolvedIsPartnerAuth = true;
            console.log('✅ Partner session recovered from AsyncStorage:', resolvedPartnerInfo.auth_id);
          } else {
            console.log('ℹ️ No partner session in AsyncStorage either');
          }
        }

        if (resolvedIsPartnerAuth && resolvedPartnerToken && resolvedPartnerInfo) {
          console.log('🤝 Partner session found:', resolvedPartnerInfo.auth_id);
          console.log('🔍 Validating partner token...');

          try {
            await partnerAuthApi.validateToken(resolvedPartnerToken);

            if (!isMounted.current) return;
            console.log('✅ Partner token valid → PartnerHome');

            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'App',
                  state: { routes: [{ name: 'PartnerHome' }] },
                },
              ],
            });

          } catch (err: any) {
            if (!isMounted.current) return;

            // ✅ No internet — trust cached partner session, let them in
            if (err instanceof NetworkError || err.name === 'NetworkError') {
              console.log('📵 No internet — skipping partner validation, using cached session');
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'App',
                    state: { routes: [{ name: 'PartnerHome' }] },
                  },
                ],
              });
              return;
            }

            // ✅ Actual auth failure (401 / token truly expired) — logout partner
            console.log('❌ Partner token invalid → logging out:', err.message);
            await dispatch(partnerLogout(resolvedPartnerToken));

            // Fall through to user auth check
            await navigateUser();
          }
          return; // ← always return after partner block
        }

        // ── 2. User session check ─────────────────────────────────────────
        await navigateUser();

      } catch (err) {
        console.log('❌ SplashScreen error:', err);
        if (!isMounted.current) return;
        navigation.replace('Auth');
      }
    };

    const navigateUser = async () => {
      if (!isMounted.current) return;

      if (isUserAuth && user && userToken) {
        console.log('👤 User session found:', user.userId);
        console.log('🔍 Validating user token...');

        try {
          await apiClient.get('/wa-auth/validate');
          if (!isMounted.current) return;
          console.log('✅ User token valid → App');
          navigation.replace('App');

        } catch (err: any) {
          if (!isMounted.current) return;

          // ✅ No internet — trust cached user session, let them in
          if (err instanceof NetworkError || err.name === 'NetworkError') {
            console.log('📵 No internet — skipping user validation, using cached session');
            navigation.replace('App');
            return;
          }

          // ✅ Actual auth failure — force logout
          console.log('❌ User token invalid → force logout:', err.message);
          await dispatch(forceLogoutOnSessionExpired());
          navigation.replace('Auth');
        }

      } else {
        console.log('❌ No session found → Auth');
        if (!isMounted.current) return;
        navigation.replace('Auth');
      }
    };

    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 1200);

    return () => {
      console.log('🧹 SplashScreen: Unmounting...');
      isMounted.current = false;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Image
        source={require('../../../assets/images/mysehat_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#F59E0B" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  logo:   { width: 240, height: 80 },
  loader: { marginTop: 30 },
});