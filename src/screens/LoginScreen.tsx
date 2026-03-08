import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { signIn, resetPassword, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    clearError();
    try {
      await signIn(email, password);
    } catch {
      // error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) return;
    setLoading(true);
    clearError();
    try {
      await resetPassword(resetEmail);
      setResetEmailSent(true);
    } catch {
      // error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>MushroomFarm</Text>
          <Text style={styles.subtitle}>Smart Cultivation Management</Text>
        </View>

        {/* Login Form */}
        {!showForgotPassword ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubtitle}>Welcome back, Farm Operator</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={18} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              outlineColor="#2a2a4a"
              activeOutlineColor="#3b82f6"
              textColor="#fff"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
              left={<TextInput.Icon icon="email-outline" color="#3b82f6" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              outlineColor="#2a2a4a"
              activeOutlineColor="#3b82f6"
              textColor="#fff"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
              left={<TextInput.Icon icon="lock-outline" color="#3b82f6" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  color="#888"
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TouchableOpacity
              onPress={() => {
                clearError();
                setResetEmail(email);
                setShowForgotPassword(true);
              }}
              style={styles.forgotPasswordLink}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password}
              style={styles.primaryButton}
              buttonColor="#3b82f6"
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                'Sign In'
              )}
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              onPress={onNavigateToRegister}
              style={styles.secondaryButton}
              textColor="#3b82f6"
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Create New Account
            </Button>
          </View>
        ) : (
          /* Forgot Password Form */
          <View style={styles.form}>
            <View style={styles.formTitleRow}>
              <MaterialCommunityIcons name="lock-reset" size={24} color="#3b82f6" />
              <Text style={styles.formTitle}>Reset Password</Text>
            </View>
            <Text style={styles.resetSubtext}>
              Enter your email and we'll send a reset link.
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={18} color="#f44336" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {resetEmailSent ? (
              <View style={styles.successContainer}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#4caf50" />
                <Text style={styles.successText}>
                  Reset email sent! Check your inbox.
                </Text>
              </View>
            ) : null}

            <TextInput
              label="Email"
              value={resetEmail}
              onChangeText={setResetEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor="#2a2a4a"
              activeOutlineColor="#3b82f6"
              textColor="#fff"
              theme={{ colors: { onSurfaceVariant: '#888' } }}
              left={<TextInput.Icon icon="email-outline" color="#3b82f6" />}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              disabled={loading || !resetEmail.trim() || resetEmailSent}
              style={styles.primaryButton}
              buttonColor="#3b82f6"
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : 'Send Reset Email'}
            </Button>

            <Button
              mode="text"
              onPress={() => {
                clearError();
                setResetEmailSent(false);
                setShowForgotPassword(false);
              }}
              textColor="#9e9e9e"
              style={styles.backButton}
            >
              Back to Sign In
            </Button>
          </View>
        )}

        <Text style={styles.footerText}>
          Mushroom Farm Management System v1.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a18',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  /* ---- Header / Logo ---- */
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    color: '#8899bb',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* ---- Form Card ---- */
  form: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e2d4a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  formTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  formSubtitle: {
    color: '#6b7a99',
    fontSize: 13,
    marginBottom: 20,
  },

  /* ---- Alerts ---- */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  errorText: {
    color: '#f44336',
    flex: 1,
    fontSize: 13,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  successText: {
    color: '#4caf50',
    flex: 1,
    fontSize: 13,
  },

  /* ---- Inputs ---- */
  input: {
    marginBottom: 14,
    backgroundColor: '#0d1220',
  },

  /* ---- Links ---- */
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
  },

  /* ---- Buttons ---- */
  primaryButton: {
    borderRadius: 10,
    marginBottom: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  backButton: {
    marginTop: 4,
  },

  /* ---- Divider ---- */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e2d4a',
  },
  dividerText: {
    color: '#4a5568',
    fontSize: 12,
  },

  /* ---- Reset ---- */
  resetSubtext: {
    color: '#8899bb',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },

  /* ---- Footer ---- */
  footerText: {
    color: '#2d3748',
    textAlign: 'center',
    fontSize: 11,
  },
});

export default LoginScreen;
