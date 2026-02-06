# QuickMart Mobile App

React Native mobile application built with Expo for iOS and Android.

## 📱 Features

- Browse products and categories
- Shopping cart management
- Order placement and tracking
- User authentication
- Address management
- Real-time updates via WebSocket

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI (installed globally or via npx)
- **For iOS**: macOS with Xcode
- **For Android**: Android Studio with Android SDK
- **For Web**: Works in any modern browser

### Installation

1. **Install dependencies** (from project root):
```bash
cd apps/mobile
npm install
```

Or from the root:
```bash
npm install --workspace=@quickmart/mobile
```

2. **Configure API URL**

Create a `.env` file in `apps/mobile/`:
```env
EXPO_PUBLIC_API_URL=https://quickmart-api-v065.onrender.com
```

Or set it when running:
```bash
EXPO_PUBLIC_API_URL=https://quickmart-api-v065.onrender.com npm run dev
```

**Note**: The app defaults to `http://localhost:4000` if `EXPO_PUBLIC_API_URL` is not set.

### Running the App

#### Development Mode

**Start Expo development server:**
```bash
npm run dev
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Show a QR code for testing on physical devices

#### Run on Different Platforms

**iOS Simulator** (macOS only):
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

**Web Browser**:
```bash
npm run web
```

### Testing on Physical Devices

1. **Install Expo Go** on your device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to the same network** as your development machine

3. **Scan the QR code** shown in:
   - Terminal (after running `npm run dev`)
   - Expo DevTools (opens automatically)

4. **For iOS**: Use Camera app to scan QR code
5. **For Android**: Use Expo Go app to scan QR code

### Building for Production

#### Using EAS Build (Recommended)

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure EAS**:
```bash
eas build:configure
```

4. **Build for Android**:
```bash
npm run build:android
```

5. **Build for iOS**:
```bash
npm run build:ios
```

#### Local Build (Advanced)

For local builds, you'll need to:
- Configure `app.json` with your bundle identifiers
- Set up signing certificates (iOS) or keystore (Android)
- Use `expo build` commands (deprecated, use EAS instead)

## 📁 Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen
│   │   ├── categories.tsx # Categories screen
│   │   ├── orders.tsx     # Orders screen
│   │   └── profile.tsx    # Profile screen
│   ├── product/[slug].tsx # Product detail
│   ├── cart.tsx           # Shopping cart
│   ├── checkout.tsx       # Checkout
│   ├── order/[id].tsx     # Order details
│   ├── login.tsx          # Login screen
│   └── register.tsx       # Registration screen
├── lib/
│   └── api.ts             # API client
├── app.json               # Expo configuration
└── package.json
```

## 🔌 API Configuration

The mobile app connects to the QuickMart API. Configure the API URL:

**Development (Local API):**
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Production (Render API):**
```env
EXPO_PUBLIC_API_URL=https://quickmart-api-v065.onrender.com
```

**For physical device testing**, use your computer's local IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

Find your local IP:
- **macOS/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

## 🔐 Authentication

The app uses JWT tokens stored securely via `expo-secure-store`:
- Tokens are automatically included in API requests
- Tokens persist across app restarts
- Logout clears stored tokens

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Expo development server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in web browser |
| `npm run build:android` | Build Android APK/AAB |
| `npm run build:ios` | Build iOS IPA |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean node_modules and .expo |

## 🐛 Troubleshooting

### Metro bundler issues
```bash
npm run clean
npm install
npm run dev
```

### Clear Expo cache
```bash
npx expo start -c
```

### Android build issues
- Ensure Android SDK is installed
- Set `ANDROID_HOME` environment variable
- Accept Android licenses: `sdkmanager --licenses`

### iOS build issues
- Ensure Xcode is installed
- Run `pod install` in `ios/` directory (if using bare workflow)
- Check signing certificates in Xcode

### API connection issues
- Verify API URL is correct
- Check CORS settings on API server
- Ensure API server is running
- For physical devices, use local IP instead of `localhost`

### Network requests failing
- Check if API requires authentication
- Verify token is being sent in headers
- Check API logs for errors

## 📱 Testing

### Manual Testing Checklist

- [ ] User registration
- [ ] User login
- [ ] Browse products
- [ ] View product details
- [ ] Add to cart
- [ ] Update cart quantities
- [ ] Remove from cart
- [ ] Place order
- [ ] View order history
- [ ] View order details
- [ ] Manage addresses
- [ ] Update profile

### Testing on Multiple Devices

Test on:
- iOS (iPhone/iPad)
- Android (Phone/Tablet)
- Web browser (for quick testing)

## 🚀 Deployment

For complete production deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Start

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login to Expo:**
```bash
eas login
```

3. **Configure project:**
```bash
eas build:configure
```

4. **Build for production:**
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Both
eas build --platform all --profile production
```

5. **Submit to stores:**
```bash
eas submit --platform ios
eas submit --platform android
```

**📖 Full deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Complete step-by-step instructions
- App Store and Google Play setup
- Credentials management
- OTA updates
- Troubleshooting

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [NativeWind Documentation](https://www.nativewind.dev/)

## 🔗 Related

- **API**: See `/apps/api/README.md`
- **Web App**: See `/apps/web/README.md`
- **Main README**: See `/README.md`
