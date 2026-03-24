# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Environment (Supabase, RevenueCat)

   Copy the example env file and fill in values:

   ```bash
   cp .env.example .env
   ```

   Required for **subscriptions**: set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (`goog_…`) from the [RevenueCat dashboard](https://app.revenuecat.com).  
   In **development**, if these are missing, the app falls back to a bundled test key so purchases can run in the simulator.

   For **Stripe card payments** (Profile → “Pay with Stripe”), add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` or live), deploy the Edge Function `supabase/functions/create-payment-intent`, and set the secret `STRIPE_SECRET_KEY` (`sk_test_…` or live) with `supabase secrets set STRIPE_SECRET_KEY=...`. Rebuild the native app after installing `@stripe/stripe-react-native` (`npx expo run:ios` / `run:android`).

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
