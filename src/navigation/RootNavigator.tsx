import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import AppNavigator from './AppNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

type AuthScreen = 'login' | 'register';

const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    if (authScreen === 'register') {
      return (
        <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />
      );
    }
    return (
      <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />
    );
  }

  return <AppNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
});

export default RootNavigator;
