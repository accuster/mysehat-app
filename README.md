This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.


===============================================================================================================================

MYSEHATAPP/
│
├── __tests__/
├── .bundle/
├── .vscode/
├── android/
├── assets/
├── ios/
├── node_modules/
│
├── components/
│   ├── common/
│   │   ├── drawer/
│   │   │   ├── DrawerHeader.tsx
│   │   │   └── DrawerItem.tsx
│   │   │
│   │   ├── AppDrawer.tsx
│   │   ├── AppHeader.tsx
│   │   ├── Drawer.tsx
│   │   ├── ErrorToast.tsx
│   │   ├── GenderDropdown.tsx
│   │   ├── InAppBrowser.tsx
│   │   ├── InAppUpdateBanner.tsx
│   │   ├── Loader.tsx
│   │   └── NetworkBanner.tsx
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── BottomTabNavigator.tsx
│   │
│   └── screens/
│       ├── auth/
│       │   ├── CompleteProfileScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   ├── PartnerLoginScreen.tsx
│       │   └── SplashScreen.tsx
│       │
│       ├── partner/
│       │   ├── BMIRecordsScreen.tsx
│       │   ├── PartnerHomeScreen.tsx
│       │   ├── PartnerProfileScreen.tsx
│       │   ├── PartnerReportPreview.tsx
│       │   ├── PartnerReportsScreen.tsx
│       │   ├── PartnerTransactionsScreen.tsx
│       │   └── RechargeScreen.tsx
│       │
│       └── user/
│           ├── AddMemberModal.tsx
│           ├── HomeScreen.tsx
│           ├── InstantReport.tsx
│           ├── ManageMembersScreen.tsx
│           ├── PaymentSuccessScreen.tsx
│           ├── PayScreen.tsx
│           ├── ProfileScreen.tsx
│           ├── ReportsScreen.tsx
│           ├── ScanScreen.tsx
│           ├── SelectUserBottomSheet.tsx
│           ├── SelectUserContainer.tsx
│           ├── SelectUserScreen.tsx
│           ├── SupportScreen.tsx
│           ├── SupportView.tsx
│           ├── TransactionsScreen.tsx
│           └── WalletScreen.tsx
│
├── contexts/
│   └── ToastContext.tsx
│
├── hooks/
│   ├── useApiErrorHandler.ts
│   ├── useBluetooth.ts
│   ├── useErrorToast.ts
│   ├── useInAppUpdate.ts
│   └── useNetworkStatus.ts
│
├── store/
│   ├── services/
│   │   ├── authApi.ts
│   │   ├── BluetoothService.ts
│   │   ├── memberApi.ts
│   │   ├── orderApi.ts
│   │   ├── partnerApi.ts
│   │   ├── partnerAuthApi.ts
│   │   ├── paymentApi.ts
│   │   ├── reportApi.ts
│   │   ├── transactionApi.ts
│   │   └── walletApi.ts
│   │   └── machineRechargeApi.ts
│   │   └── partnerWalletApi.ts
│   │
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── bluetoothSlice.ts
│   │   ├── memberSlice.ts
│   │   ├── orderSlice.ts
│   │   ├── partnerAuthSlice.ts
│   │   ├── partnerSlice.ts
│   │   ├── paymentSlice.ts
│   │   ├── reportSlice.ts
│   │   ├── transactionSlice.ts
│   │   └── walletSlice.ts
│   │   └── machineRechargeSlice.ts
│   │   └── partnerWalletSlice.ts
│   │
│   ├── constant.ts
│   ├── hook.ts
│   └── index.ts
│
├── theme/
│   └── colors.ts
│
├── types/
│   ├── auth.types.ts
│   └── react-native-razorpay.d.ts
│
├── utils/
│   ├── apiClient.ts
│   ├── encryption.ts
│   ├── generateReceiptPdf.ts
│   ├── generateReportPdf.ts
│   ├── healthMetricsCalculator.ts
│   ├── notificationService.ts
│   ├── partnerStorage.ts
│   ├── storage.ts
│   └── validators.ts
│
├── .eslintrc.js
├── .gitignore
├── .prettierrc.js
├── .watchmanconfig
├── App.tsx
├── app.json
├── babel.config.js
├── Gemfile
├── index.js
├── jest.config.js
├── metro.config.js
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
