import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Switch, Snackbar, Divider, ActivityIndicator } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LightControl, HumidifierControl } from '../types';
import {
  subscribeLightControl,
  updateLightControl,
  subscribeConnectionStatus,
  subscribeHumidifierControl,
  updateHumidifierControl,
} from '../services/firebaseService';

const SensorControlsScreen: React.FC = () => {
  const [lightControl,   setLightControl]   = useState<LightControl | null>(null);
  const [humidifier,     setHumidifier]      = useState<HumidifierControl | null>(null);
  const [isConnected,    setIsConnected]     = useState<boolean | null>(null);
  const [lastUpdate,     setLastUpdate]      = useState<string>('--');
  const [snackMessage,   setSnackMessage]    = useState('');
  const [snackVisible,   setSnackVisible]    = useState(false);
  const [lightUpdating,  setLightUpdating]   = useState(false);
  const [humUpdating,    setHumUpdating]     = useState(false);
  const [sliderValue,    setSliderValue]     = useState<number>(50);
  const [sliderSaving,   setSliderSaving]    = useState(false);

  useEffect(() => {
    const u1 = subscribeLightControl((data) => {
      if (data) {
        setLightControl(data);
        setSliderValue(data.intensity ?? 50);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    });
    const u2 = subscribeConnectionStatus(setIsConnected);
    const u3 = subscribeHumidifierControl((data) => {
      if (data) setHumidifier(data);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Light handlers ───────────────────────────────────────────────────────────
  const handleLightToggle = async () => {
    if (!lightControl) return;
    setLightUpdating(true);
    try {
      await updateLightControl({ status: lightControl.status === 'on' ? 'off' : 'on' });
    } catch {
      setSnackMessage('Failed to update light status');
      setSnackVisible(true);
    } finally {
      setLightUpdating(false);
    }
  };

  const handleIntensityCommit = useCallback(async (value: number) => {
    setSliderSaving(true);
    try {
      await updateLightControl({ intensity: Math.round(value) });
    } catch {
      setSnackMessage('Failed to update light intensity');
      setSnackVisible(true);
    } finally {
      setSliderSaving(false);
    }
  }, []);

  // ── Humidifier handler ───────────────────────────────────────────────────────
  const handleHumidifierToggle = async () => {
    setHumUpdating(true);
    try {
      const newStatus = humidifier?.status === 'on' ? 'off' : 'on';
      await updateHumidifierControl({ status: newStatus });
    } catch {
      setSnackMessage('Failed to update humidifier status');
      setSnackVisible(true);
    } finally {
      setHumUpdating(false);
    }
  };

  const connectionLabel = isConnected === null ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected';
  const connectionColor = isConnected === null ? '#ff9800' : isConnected ? '#4caf50' : '#f44336';
  const humOn = humidifier?.status === 'on';

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>Controls</Text>

          {/* ── Light Control ──────────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#2b2000' }]}>
                  <MaterialIcons name="wb-sunny" size={20} color="#fbbf24" />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>Light Control</Text>
                {(lightUpdating || sliderSaving) && (
                  <ActivityIndicator size="small" style={{ marginLeft: 'auto' }} />
                )}
              </View>
              <Divider style={styles.divider} />

              {/* On / Off */}
              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Text style={styles.controlLabel}>Light Status</Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[styles.statusDot, { backgroundColor: lightControl?.status === 'on' ? '#fbbf24' : '#555' }]} />
                    <Text style={styles.controlValue}>
                      {lightControl?.status === 'on' ? 'On' : 'Off'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={lightControl?.status === 'on'}
                  onValueChange={handleLightToggle}
                  disabled={lightUpdating}
                  color="#fbbf24"
                />
              </View>

              <Divider style={styles.innerDivider} />

              {/* Intensity slider */}
              <View style={styles.sliderSection}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.controlLabel}>Intensity</Text>
                  <View style={styles.intensityBadge}>
                    <Text style={styles.intensityValue}>{Math.round(sliderValue)}%</Text>
                  </View>
                </View>
                <View style={styles.sliderRow}>
                  <MaterialIcons name="brightness-low" size={18} color="#666" style={styles.sliderIcon} />
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={sliderValue}
                    onValueChange={(v) => setSliderValue(v)}
                    onSlidingComplete={handleIntensityCommit}
                    minimumTrackTintColor="#fbbf24"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#fbbf24"
                  />
                  <MaterialIcons name="brightness-high" size={18} color="#fbbf24" style={styles.sliderIcon} />
                </View>
                <View style={styles.sliderTicks}>
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <Text key={tick} style={styles.sliderTick}>{tick}%</Text>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* ── Humidifier Control ─────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#00182b' }]}>
                  <MaterialCommunityIcons name="water" size={20} color="#38bdf8" />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>Humidifier</Text>
                {humUpdating && <ActivityIndicator size="small" style={{ marginLeft: 'auto' }} />}
              </View>
              <Divider style={styles.divider} />

              {/* On / Off toggle */}
              <View style={styles.controlRow}>
                <View style={styles.controlInfo}>
                  <Text style={styles.controlLabel}>Manual Control</Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[styles.statusDot, { backgroundColor: humOn ? '#38bdf8' : '#555' }]} />
                    <Text style={styles.controlValue}>
                      {humOn ? 'On' : 'Off'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={humOn}
                  onValueChange={handleHumidifierToggle}
                  disabled={humUpdating}
                  color="#38bdf8"
                />
              </View>

              {/* Info note */}
              <View style={styles.infoNote}>
                <MaterialIcons name="bug-report" size={14} color="#ec4899" />
                <Text style={styles.infoNoteText}>
                  Pest detection automatically pulses the humidifier for 3 s
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* ── System Information ─────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#0d1b2e' }]}>
                  <MaterialIcons name="info-outline" size={20} color="#3b82f6" />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>System Information</Text>
              </View>
              <Divider style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Sensors</Text>
                <Text style={styles.infoValue}>5 Active</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Update</Text>
                <Text style={styles.infoValue}>{lastUpdate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Firebase</Text>
                <View style={styles.connectionBadge}>
                  <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
                  <Text style={[styles.infoValue, { color: connectionColor }]}>{connectionLabel}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

        </View>
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackMessage}
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f0f1a' },
  content:          { padding: 16, paddingBottom: 40 },
  title:            { color: '#fff', marginBottom: 16, fontWeight: 'bold' },
  card:             { marginBottom: 16, backgroundColor: '#12121f', borderRadius: 14 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIconWrap:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle:        { color: '#fff', fontWeight: '700', flex: 1 },
  divider:          { backgroundColor: '#1e1e2e', marginBottom: 8 },
  innerDivider:     { backgroundColor: '#1e1e2e', marginVertical: 4 },
  controlRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  controlInfo:      { flex: 1, paddingRight: 12 },
  controlLabel:     { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 3 },
  statusBadgeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:        { width: 7, height: 7, borderRadius: 4 },
  controlValue:     { color: '#888', fontSize: 13 },
  // Slider
  sliderSection:    { paddingTop: 8, paddingBottom: 4 },
  sliderLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  intensityBadge:   { backgroundColor: '#2b2000', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#fbbf2466' },
  intensityValue:   { color: '#fbbf24', fontWeight: 'bold', fontSize: 13 },
  sliderRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sliderIcon:       { width: 22, textAlign: 'center' },
  slider:           { flex: 1, height: 40 },
  sliderTicks:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 26, marginTop: -4 },
  sliderTick:       { color: '#555', fontSize: 10 },
  // Info note (pest)
  infoNote:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#1a0a10', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#ec489933' },
  infoNoteText:     { color: '#ec4899aa', fontSize: 12, flex: 1 },
  // System info
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e2e' },
  infoLabel:        { color: '#888', fontSize: 13 },
  infoValue:        { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  connectionBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot:    { width: 8, height: 8, borderRadius: 4 },
  snackbar:         { backgroundColor: '#1a1a2e' },
});

export default SensorControlsScreen;
