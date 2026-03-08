import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Divider, ActivityIndicator } from 'react-native-paper';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { subscribeAlerts, pulseHumidifierForPest } from '../services/firebaseService';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import MLModelScreen from '../screens/MLModelScreen';
import RobotArmScreen from '../screens/RobotArmScreen';
import SensorControlsScreen from '../screens/SensorControlsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import AdvisoryScreen from '../screens/AdvisoryScreen';

const Drawer = createDrawerNavigator();

/** Custom drawer content with user profile section at the top and logout at the bottom */
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { user, logOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await logOut();
    setSigningOut(false);
  };

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <View style={drawerStyles.container}>
      {/* App logo header */}
      <View style={drawerStyles.logoHeader}>
        <View style={drawerStyles.logoRing}>
          <Image
            source={require('../../assets/logo.png')}
            style={drawerStyles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={drawerStyles.logoTitle}>MushroomFarm</Text>
      </View>

      {/* User profile header */}
      <View style={drawerStyles.profileSection}>
        <View style={drawerStyles.avatar}>
          <Text style={drawerStyles.avatarText}>{initials}</Text>
        </View>
        <View style={drawerStyles.profileInfo}>
          <Text style={drawerStyles.displayName} numberOfLines={1}>
            {user?.displayName || 'Farm Operator'}
          </Text>
          <Text style={drawerStyles.email} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </View>

      <Divider style={drawerStyles.divider} />

      {/* Navigation items */}
      <DrawerContentScrollView {...props} style={drawerStyles.scrollView}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer: App version + Logout */}
      <View style={drawerStyles.footer}>
        <Divider style={drawerStyles.divider} />
        <TouchableOpacity
          style={drawerStyles.logoutButton}
          onPress={handleLogout}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#f44336" />
          ) : (
            <MaterialIcons name="logout" size={22} color="#f44336" />
          )}
          <Text style={drawerStyles.logoutText}>
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
        <Text style={drawerStyles.versionText}>v1.0.0 • Mushroom Farm</Text>
      </View>
    </View>
  );
};

/** Global pest-detection listener — always active while user is logged in. */
function usePestDetection() {
  const handledPestIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeAlerts((data) => {
      const newPestAlerts = data.filter(
        (a) =>
          a.type === 'pest' &&
          !a.acknowledged &&
          !(a as any).false_alarm &&
          !handledPestIds.current.has(a.id)
      );
      if (newPestAlerts.length > 0) {
        newPestAlerts.forEach((a) => handledPestIds.current.add(a.id));
        pulseHumidifierForPest().catch((err) =>
          console.warn('[PestDetection] Failed to pulse humidifier:', err)
        );
      }
    });
    return () => unsubscribe();
  }, []);
}

export default function AppNavigator() {
  usePestDetection();
  return (
    <NavigationContainer>
      <Drawer.Navigator
        id="main-drawer"
        initialRouteName="Dashboard"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerActiveTintColor: '#3b82f6',
          drawerInactiveTintColor: '#9e9e9e',
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          drawerStyle: {
            width: 280,
            backgroundColor: '#0f0f1a',
          },
          drawerLabelStyle: {
            fontSize: 15,
          },
        }}
      >
        <Drawer.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="dashboard" size={size} color={color} />
            ),
            title: 'Dashboard',
          }}
        />
        <Drawer.Screen
          name="MLModel"
          component={MLModelScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="smart-toy" size={size} color={color} />
            ),
            title: 'ML Model',
          }}
        />
        <Drawer.Screen
          name="RobotArm"
          component={RobotArmScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="precision-manufacturing" size={size} color={color} />
            ),
            title: 'Robot Arm Control',
          }}
        />
        <Drawer.Screen
          name="Sensors"
          component={SensorControlsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="sensors" size={size} color={color} />
            ),
            title: 'Sensor Controls',
          }}
        />
        <Drawer.Screen
          name="Alerts"
          component={AlertsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="notifications-active" size={size} color={color} />
            ),
            title: 'Alerts',
          }}
        />
        <Drawer.Screen
          name="Advisory"
          component={AdvisoryScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="auto-fix-high" size={size} color={color} />
            ),
            title: 'AI Advisory',
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
    gap: 12,
  },
  logoRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 4,
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  email: {
    color: '#9e9e9e',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    backgroundColor: '#222',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  footer: {
    paddingBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  logoutText: {
    color: '#f44336',
    fontSize: 15,
    fontWeight: '500',
  },
  versionText: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 4,
  },
});
