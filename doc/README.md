# 🍄 Mushroom Farm Mobile App

A React Native mobile application for monitoring and controlling a mushroom farming system. Built with Expo and Firebase for real-time data synchronization.

## ✅ Status: FULLY FUNCTIONAL & TESTED

- ✅ All icons rendering correctly (using @expo/vector-icons)
- ✅ Firebase real-time data synchronization working
- ✅ All 5 screens tested and operational
- ✅ Sensor Controls matching web app functionality
- ✅ Tested on Android emulator
- ✅ Ready for deployment on physical devices

---

## 📱 Features

- **Real-time Dashboard**: Monitor temperature, humidity, CO2, moisture, and pH levels
- **Live Camera Feed**: View ESP32-CAM video stream
- **ML Model Integration**: AI-powered predictions for optimal growing conditions
- **Robot Arm Control**: Navigate between different cultivation plots
- **Sensor Controls**: Manual sensor readings and automated light control
- **Alert System**: Real-time notifications for system events and anomalies

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo Go** app on your mobile device
    - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
    - [iOS](https://apps.apple.com/app/expo-go/id982107779)

### Installation

#### Option 1: Automated Setup (Recommended)

```bash
# Navigate to the mobile app directory
cd mushroom-firmware/mushroom-farm-mobile

# Run the setup script
./setup.sh
```

#### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Testing on Your Phone

```bash
# Run the test script (interactive)
./test-device.sh

# Or manually start the dev server
npm start
```

Then:
1. Open **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. Wait for the app to load

**Make sure your phone and computer are on the same WiFi network!**

---

## 📂 Project Structure

```
mushroom-farm-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Alerts/         # Alert-related components
│   │   ├── Dashboard/      # Dashboard widgets
│   │   ├── MLModel/        # ML model displays
│   │   ├── RobotArm/       # Robot control components
│   │   ├── Sensors/        # Sensor visualizations
│   │   └── Shared/         # Shared components (SensorCard, etc.)
│   ├── config/             # Configuration files
│   │   ├── firebase.ts     # Firebase configuration
│   │   └── initFirebaseData.ts  # Initial data setup
│   ├── context/            # React Context providers
│   │   └── ThemeContext.tsx
│   ├── navigation/         # App navigation
│   │   └── AppNavigator.tsx
│   ├── screens/            # Main app screens
│   │   ├── DashboardScreen.tsx
│   │   ├── MLModelScreen.tsx
│   │   ├── RobotArmScreen.tsx
│   │   ├── SensorControlsScreen.tsx
│   │   └── AlertsScreen.tsx
│   ├── services/           # API and Firebase services
│   │   └── firebaseService.ts
│   └── types/              # TypeScript type definitions
│       └── index.ts
├── assets/                 # Images, fonts, icons
├── android/                # Native Android code (auto-generated)
├── ios/                    # Native iOS code (auto-generated)
├── App.tsx                 # Root component
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
├── package.json            # Dependencies
├── setup.sh                # 🔧 Setup script
├── test-device.sh          # 📱 Device testing script
├── build-apk.sh            # 📦 APK building script
└── README.md               # This file
```

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm start

# Start with cache cleared
npm start --clear

# Run on Android emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Run as web app
npm run web
```

### Helper Scripts

```bash
# Setup environment (first time)
./setup.sh

# Test on physical device (interactive)
./test-device.sh

# Build APK (interactive)
./build-apk.sh
```

---

## 📱 Testing on Physical Device

### Method 1: Expo Go (Easiest - Recommended)

**No build required!**

1. Install **Expo Go** app:
    - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
    - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start dev server:
   ```bash
   npm start
   # or
   ./test-device.sh
   ```

3. Scan QR code:
    - **Android**: Open Expo Go → Scan QR
    - **iOS**: Open Camera app → Scan QR → Tap notification

4. **Important**: Make sure your phone and computer are on the **same WiFi network**

**Advantages:**
- ✅ No build required
- ✅ Instant updates (hot reload)
- ✅ Easy to test changes
- ✅ Works on any network with tunnel mode

**Troubleshooting:**
- Not working? Try tunnel mode: `npm start --tunnel`
- Still issues? Type the URL manually in Expo Go

### Method 2: Development Build

For advanced testing with full native features:

```bash
# Android (requires Android Studio + USB debugging)
npm run android

# iOS (requires macOS + Xcode)
npm run ios
```

**Requirements:**
- ✅ Android Studio (for Android)
- ✅ Xcode + Apple Developer account (for iOS)
- ✅ USB cable
- ✅ Device in developer mode

---

## 📦 Building APK for Android

### Method 1: EAS Build (Easiest - Cloud Build)

**No Android Studio required!**

```bash
# Use the build script (interactive)
./build-apk.sh

# Or manually
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

**Steps:**
1. Script will ask you to login to Expo (create free account if needed)
2. Build happens in the cloud (~5-15 minutes)
3. You'll get a download link for the APK
4. Install APK on your Android device

**Advantages:**
- ✅ No Android Studio needed
- ✅ Cloud-based (works on any computer)
- ✅ Optimized builds
- ✅ Easy to share APK links

**Build Profiles:**
- `preview` - For testing (recommended)
- `production` - Optimized for release

### Method 2: Local Build

**Requires Android Studio + Android SDK**

```bash
# Using the build script
./build-apk.sh

# Or manually
cd android
./gradlew assembleDebug    # For testing
./gradlew assembleRelease  # For production
```

**APK Location:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

**Requirements:**
1. Install [Android Studio](https://developer.android.com/studio)
2. Set environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

---

## 🔧 Configuration

### Firebase Setup

The app connects to Firebase Realtime Database. Configuration is in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};
```

**To use your own Firebase:**
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Realtime Database**
3. Update `src/config/firebase.ts`
4. Set database rules for read/write access

### App Customization

Edit `app.json`:
- App name, slug, version
- Bundle identifier
- Icons and splash screen
- Permissions
- Build settings

---

## 🐛 Troubleshooting

### App Crashes / "Something went wrong"

**Solution 1: Clear cache**
```bash
npm start --clear
```

**Solution 2: Check Firebase**
- Verify internet connection
- Check Firebase database rules
- Ensure config is correct in `src/config/firebase.ts`

**Solution 3: Reinstall dependencies**
```bash
rm -rf node_modules
npm install
npm start --clear
```

### QR Code Not Working

**Solution:**
```bash
# Use tunnel mode (works on any network)
npm start --tunnel
```

Or manually type the URL shown in terminal into Expo Go app

### Icons Not Showing

Icons should now work correctly (using `@expo/vector-icons`). If issues persist:
```bash
npm start --clear
```

### Build Failures

**Android:**
```bash
cd android
./gradlew clean
cd ..
npm start --clear
```

**iOS:**
```bash
cd ios
pod install
cd ..
npm start --clear
```

---

## 🔄 Firebase Database Structure

The app expects this structure:

```json
{
  "sensors": {
    "current": {
      "temperature": 24.5,
      "humidity": 85.2,
      "co2": 820,
      "moisture": 72.8,
      "ph": 6.5
    },
    "temperature/humidity/co2/moisture/ph": {
      "history": {
        "reading_1": { "timestamp": 1234567890, "value": 24.5 }
      }
    }
  },
  "camera": {
    "frame": "base64_encoded_jpeg"
  },
  "robotArm": {
    "currentPlot": 1,
    "targetPlot": 1,
    "status": "idle"
  },
  "lightControl": {
    "intensity": 75,
    "isAuto": true,
    "status": "on"
  },
  "alerts": {
    "alert_1": {
      "type": "warning",
      "message": "Alert message",
      "timestamp": 1234567890,
      "acknowledged": false
    }
  }
}
```

---

## 🆕 Setting Up on a New Computer

### 1. Prerequisites Check

Ensure you have:
- [ ] Node.js v16+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Expo Go app on your phone

### 2. Clone & Setup

```bash
# Clone the repository
git clone <repository-url>
cd mushroom-firmware/mushroom-farm-mobile

# Run automated setup
./setup.sh

# Or manual setup
npm install
```

### 3. Start Development

```bash
# Start dev server
npm start

# Or use the helper script
./test-device.sh
```

### 4. Optional: Android Development

Only if you want to build APKs locally:

1. Download [Android Studio](https://developer.android.com/studio)
2. Install Android SDK
3. Set environment variables (see Configuration section)
4. Run `./build-apk.sh`

---

## 📝 Development Guidelines

### Code Style

- ✅ Use TypeScript for type safety
- ✅ Functional components with React hooks
- ✅ Keep components small and focused
- ✅ Use `@expo/vector-icons` for icons
- ✅ Add comments for complex logic

### Adding Features

1. Define types in `src/types/index.ts`
2. Add Firebase methods in `src/services/firebaseService.ts`
3. Create components in `src/components/`
4. Create screens in `src/screens/`
5. Update navigation in `src/navigation/AppNavigator.tsx`

### Testing Checklist

- [ ] Test on Android
- [ ] Test on iOS (if possible)
- [ ] Test with/without internet
- [ ] Test with real Firebase data
- [ ] Test all user interactions

---

## 📚 Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **UI**: React Native Paper (Material Design)
- **Navigation**: React Navigation (Drawer)
- **Charts**: React Native Chart Kit
- **Icons**: @expo/vector-icons (Material Icons)
- **Database**: Firebase Realtime Database
- **State**: React Context API

---

## 🔗 Related Projects

- **Web Dashboard**: `../` - React web application
- **ESP32 Firmware**: Check hardware folder for Arduino code

---

## 📄 License

Part of the Mushroom Farm Monitoring System project.

---

## 🆘 Need Help?

1. **Check this README** - Most common issues covered
2. **Run setup script**: `./setup.sh`
3. **Clear cache**: `npm start --clear`
4. **Check Firebase console** for data/rules issues
5. **Consult docs**:
    - [Expo Docs](https://docs.expo.dev/)
    - [Firebase Docs](https://firebase.google.com/docs)
    - [React Navigation](https://reactnavigation.org/)

---

**Built with ❤️ using React Native + Expo + Firebase**

🍄 Happy Mushroom Farming! 🍄
