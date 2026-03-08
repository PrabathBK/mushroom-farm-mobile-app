import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!displayName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    clearError();
    setLocalError(null);
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, displayName);
    } catch {
      // error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

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
        {/* Header */}
        <View style={styles.header}>
          {/* Outer glow ring */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join MushroomFarm Management</Text>
        </View>

        {/* Register Form */}
        <View style={styles.form}>
          {displayError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#f44336" />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            mode="outlined"
            autoCapitalize="words"
            autoComplete="name"
            style={styles.input}
            outlineColor="#2a2a4a"
            activeOutlineColor="#3b82f6"
            textColor="#fff"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            left={<TextInput.Icon icon="account-outline" color="#3b82f6" />}
          />

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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            outlineColor="#2a2a4a"
            activeOutlineColor="#3b82f6"
            textColor="#fff"
            theme={{ colors: { onSurfaceVariant: '#888' } }}
            left={<TextInput.Icon icon="lock-check-outline" color="#3b82f6" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                color="#888"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />

          {/* Password strength hint */}
          <View style={styles.passwordHint}>
            <MaterialCommunityIcons
              name={password.length >= 6 ? 'check-circle' : 'information-outline'}
              size={14}
              color={password.length >= 6 ? '#4caf50' : '#4a5568'}
            />
            <Text style={[styles.hintText, password.length >= 6 && styles.hintTextValid]}>
              Minimum 6 characters
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleRegister}
            disabled={loading}
            style={styles.primaryButton}
            buttonColor="#3b82f6"
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              'Create Account'
            )}
          </Button>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            onPress={() => {
              clearError();
              setLocalError(null);
              onNavigateToLogin();
            }}
            style={styles.secondaryButton}
            textColor="#3b82f6"
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Sign In
          </Button>
        </View>

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
    marginBottom: 28,
  },
  logoContainer: {
    width: 106,
    height: 106,
    borderRadius: 53,
    overflow: 'hidden',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    color: '#8899bb',
    fontSize: 13,
    letterSpacing: 0.2,
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

  /* ---- Inputs ---- */
  input: {
    marginBottom: 14,
    backgroundColor: '#0d1220',
  },

  /* ---- Password hint ---- */
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 18,
  },
  hintText: {
    fontSize: 12,
    color: '#4a5568',
  },
  hintTextValid: {
    color: '#4caf50',
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
    fontSize: 11,
  },

  /* ---- Footer ---- */
  footerText: {
    color: '#2d3748',
    textAlign: 'center',
    fontSize: 11,
  },
});

export default RegisterScreen;
