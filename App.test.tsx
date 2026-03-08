import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Simple test app to verify everything works
export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>🍄 Mushroom Farm App</Text>
          <Text style={styles.subtitle}>Testing Connection...</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>✅ React Native: Working</Text>
            <Text style={styles.cardText}>✅ Expo: Working</Text>
            <Text style={styles.cardText}>✅ SafeAreaProvider: Working</Text>
            <Text style={styles.cardText}>✅ StatusBar: Working</Text>
          </View>
          <Text style={styles.info}>
            If you see this, the basic app is working!{'\n\n'}
            Next step: Test navigation and Firebase
          </Text>
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#3b82f6',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    width: '100%',
  },
  cardText: {
    color: '#4caf50',
    fontSize: 16,
    marginBottom: 10,
  },
  info: {
    color: '#9e9e9e',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
