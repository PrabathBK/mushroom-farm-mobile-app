import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearError = () => setError(null);

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please check your email and password.';
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return 'Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
      case 'auth/app-not-authorized':
        return 'App not authorized to use Firebase Authentication.';
      case 'auth/expired-action-code':
        return 'The action code has expired. Please try again.';
      case 'auth/invalid-action-code':
        return 'The action code is invalid. Please try again.';
      default:
        return `Auth error (${code || 'unknown'}). Please try again.`;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const message = getErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(newUser, { displayName: displayName.trim() });
      // Refresh the user object so displayName is visible immediately
      setUser({ ...newUser, displayName: displayName.trim() } as User);
    } catch (err: any) {
      const message = getErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError('Failed to sign out. Please try again.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const message = getErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut, resetPassword, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
