#!/bin/bash

# Mushroom Farm Mobile App - Test on Physical Device Script
# This script helps you test the app on a real Android/iOS device

set -e

echo "📱 Mushroom Farm Mobile - Device Testing"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "Select testing method:"
echo "  1) Expo Go (Recommended - No build required)"
echo "  2) Development Build (Requires building)"
echo ""
read -p "Enter choice (1-2): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}📱 Starting Expo Development Server...${NC}"
        echo ""
        echo "Instructions:"
        echo "  1. Install 'Expo Go' app on your phone:"
        echo "     - Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
        echo "     - iOS: https://apps.apple.com/app/expo-go/id982107779"
        echo ""
        echo "  2. Make sure your phone and computer are on the same WiFi network"
        echo ""
        echo "  3. Scan the QR code that appears below with:"
        echo "     - Android: Expo Go app"
        echo "     - iOS: Camera app, then tap the Expo notification"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
        echo ""
        
        npx expo start
        ;;
    2)
        echo ""
        echo -e "${BLUE}🔨 Building development build...${NC}"
        echo ""
        echo "This requires:"
        echo "  - Android: Android Studio and USB debugging enabled"
        echo "  - iOS: Xcode and developer account (macOS only)"
        echo ""
        read -p "Select platform (android/ios): " platform
        
        if [ "$platform" = "android" ]; then
            echo ""
            echo "Make sure:"
            echo "  1. Android device is connected via USB"
            echo "  2. USB debugging is enabled"
            echo "  3. Device is authorized on this computer"
            echo ""
            read -p "Press Enter to continue..."
            
            npx expo run:android
        elif [ "$platform" = "ios" ]; then
            if [[ "$OSTYPE" != "darwin"* ]]; then
                echo -e "${RED}❌ iOS development requires macOS${NC}"
                exit 1
            fi
            
            echo ""
            echo "Make sure:"
            echo "  1. iOS device is connected via USB"
            echo "  2. Device is trusted on this computer"
            echo "  3. You're signed in to Xcode with an Apple ID"
            echo ""
            read -p "Press Enter to continue..."
            
            npx expo run:ios
        else
            echo -e "${RED}❌ Invalid platform${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac
