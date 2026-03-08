#!/bin/bash

# Mushroom Farm Mobile App - Build APK Script
# This script helps you build an APK for Android

set -e

echo "📦 Mushroom Farm Mobile - APK Builder"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "Select build method:"
echo "  1) EAS Build (Cloud - Recommended, requires Expo account)"
echo "  2) Local Build (Requires Android Studio)"
echo ""
read -p "Enter choice (1-2): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}☁️  Using EAS Build (Cloud)${NC}"
        echo ""
        
        # Check if EAS CLI is installed
        if ! command -v eas &> /dev/null; then
            echo -e "${YELLOW}📦 Installing EAS CLI...${NC}"
            npm install -g eas-cli
        fi
        
        echo "Build profiles available:"
        echo "  - preview: APK for testing (recommended)"
        echo "  - production: Optimized APK for release"
        echo ""
        read -p "Select profile (preview/production): " profile
        
        if [ "$profile" != "preview" ] && [ "$profile" != "production" ]; then
            profile="preview"
            echo "Using default profile: preview"
        fi
        
        echo ""
        echo -e "${BLUE}🚀 Starting EAS Build...${NC}"
        echo ""
        echo "You may be asked to:"
        echo "  1. Log in to your Expo account"
        echo "  2. Configure the project (if first time)"
        echo ""
        echo "The build will run in the cloud. You'll get a download link when complete."
        echo ""
        
        eas build --platform android --profile "$profile"
        ;;
    2)
        echo ""
        echo -e "${BLUE}🔨 Using Local Build${NC}"
        echo ""
        
        # Check Android environment
        if [ -z "$ANDROID_HOME" ]; then
            echo -e "${RED}❌ ANDROID_HOME is not set!${NC}"
            echo ""
            echo "Please install Android Studio and set up the environment:"
            echo "  1. Install Android Studio from https://developer.android.com/studio"
            echo "  2. Add to your ~/.bashrc or ~/.zshrc:"
            echo "     export ANDROID_HOME=\$HOME/Library/Android/sdk"
            echo "     export PATH=\$PATH:\$ANDROID_HOME/emulator"
            echo "     export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
            exit 1
        fi
        
        echo "Select build type:"
        echo "  1) Debug APK (for testing)"
        echo "  2) Release APK (for production)"
        echo ""
        read -p "Enter choice (1-2): " buildtype
        
        if [ "$buildtype" = "1" ]; then
            echo ""
            echo -e "${BLUE}🔨 Building Debug APK...${NC}"
            cd android && ./gradlew assembleDebug
            
            APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
            if [ -f "$APK_PATH" ]; then
                echo ""
                echo -e "${GREEN}✅ Debug APK built successfully!${NC}"
                echo "Location: $APK_PATH"
            fi
        else
            echo ""
            echo -e "${BLUE}🔨 Building Release APK...${NC}"
            echo ""
            echo -e "${YELLOW}⚠️  Note: Release builds require signing configuration${NC}"
            echo "If not configured, this will create an unsigned APK"
            echo ""
            
            cd android && ./gradlew assembleRelease
            
            APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
            if [ -f "$APK_PATH" ]; then
                echo ""
                echo -e "${GREEN}✅ Release APK built successfully!${NC}"
                echo "Location: $APK_PATH"
            fi
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Build process completed!${NC}"
echo ""
