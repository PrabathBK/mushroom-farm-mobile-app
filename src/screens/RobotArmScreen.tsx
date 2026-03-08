import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider, Snackbar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotArmPosition, Plot } from '../types';
import {
  subscribeRobotArmPosition,
  subscribePlots,
  moveRobotToPlot,
  subscribeConnectionStatus,
} from '../services/firebaseService';

const RobotArmScreen: React.FC = () => {
  const [robotPosition, setRobotPosition] = useState<RobotArmPosition>({
    currentPlot: 0,
    state: 'idle',
    lastAction: 'Loading...',
    targetPlot: 0,
  });
  const [plots,        setPlots]        = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [isConnected,  setIsConnected]  = useState<boolean | null>(null);
  const [sending,      setSending]      = useState(false);
  const [snackMsg,     setSnackMsg]     = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  // isMoving is derived purely from Firebase state — no local timers
  const isMoving = robotPosition.state === 'moving' || robotPosition.state === 'homing';

  useEffect(() => {
    const u1 = subscribeRobotArmPosition((data) => {
      if (data) setRobotPosition(data);
    });
    const u2 = subscribePlots((data) => {
      if (data && data.length > 0) {
        setPlots(data.sort((a, b) => a.id - b.id));
      } else {
        // Fallback: 4 default plots while Firebase loads
        setPlots([1, 2, 3, 4].map((i) => ({
          id: i, name: `Plot ${i}`, status: 'active' as const,
          lastVisited: new Date().toISOString(),
        })));
      }
    });
    const u3 = subscribeConnectionStatus(setIsConnected);
    return () => { u1(); u2(); u3(); };
  }, []);

  const handleMoveToPlot = useCallback(async () => {
    if (selectedPlot === null) return;
    setSending(true);
    try {
      await moveRobotToPlot(selectedPlot);
      setSnackMsg(`Command sent: move to Plot ${selectedPlot}`);
      setSnackVisible(true);
    } catch {
      setSnackMsg('Failed to send move command');
      setSnackVisible(true);
    } finally {
      setSending(false);
    }
  }, [selectedPlot]);

  const handleReturnHome = useCallback(async () => {
    setSending(true);
    try {
      await moveRobotToPlot(1);
      setSnackMsg('Command sent: return to Plot 1');
      setSnackVisible(true);
    } catch {
      setSnackMsg('Failed to send home command');
      setSnackVisible(true);
    } finally {
      setSending(false);
    }
  }, []);

  const stateColor = (s: string) => {
    switch (s) {
      case 'idle':      return '#4caf50';
      case 'moving':    return '#ff9800';
      case 'operating': return '#3b82f6';
      case 'homing':    return '#a78bfa';
      default:          return '#9e9e9e';
    }
  };

  const connectionColor = isConnected === null ? '#ff9800' : isConnected ? '#4caf50' : '#f44336';
  const connectionLabel = isConnected === null ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected';

  const canMove =
    selectedPlot !== null &&
    selectedPlot !== robotPosition.currentPlot &&
    !isMoving &&
    !sending;

  const canHome =
    robotPosition.currentPlot !== 1 &&
    !isMoving &&
    !sending;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>Robot Arm Control</Text>

          {/* ── Status Card ─────────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#0d1b2e' }]}>
                  <MaterialIcons name="precision-manufacturing" size={20} color="#3b82f6" />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>Robot Status</Text>
                {isMoving && <ActivityIndicator size="small" color="#ff9800" style={{ marginLeft: 'auto' }} />}
              </View>
              <Divider style={styles.divider} />

              {/* State badge */}
              <View style={styles.stateBadgeRow}>
                <View style={[styles.stateBadge, { borderColor: stateColor(robotPosition.state) + '66', backgroundColor: stateColor(robotPosition.state) + '18' }]}>
                  <View style={[styles.stateDot, { backgroundColor: stateColor(robotPosition.state) }]} />
                  <Text style={[styles.stateText, { color: stateColor(robotPosition.state) }]}>
                    {String(robotPosition.state).toUpperCase()}
                  </Text>
                </View>
                {/* Firebase connection */}
                <View style={styles.connBadge}>
                  <View style={[styles.connDot, { backgroundColor: connectionColor }]} />
                  <Text style={[styles.connText, { color: connectionColor }]}>{connectionLabel}</Text>
                </View>
              </View>

              {/* Position row */}
              <View style={styles.positionRow}>
                <View style={styles.positionBox}>
                  <Text style={styles.positionLabel}>Current Plot</Text>
                  <Text style={styles.positionValue}>
                    {robotPosition.currentPlot === 0 ? 'Home' : `Plot ${robotPosition.currentPlot}`}
                  </Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={22} color="#555" />
                <View style={styles.positionBox}>
                  <Text style={styles.positionLabel}>Target Plot</Text>
                  <Text style={[styles.positionValue, isMoving && { color: '#ff9800' }]}>
                    {robotPosition.targetPlot === 0 ? 'Home' : `Plot ${robotPosition.targetPlot}`}
                  </Text>
                </View>
              </View>

              <Divider style={styles.innerDivider} />

              {/* Last action */}
              <View style={styles.lastActionRow}>
                <MaterialIcons name="history" size={16} color="#555" />
                <Text style={styles.lastActionText} numberOfLines={2}>{robotPosition.lastAction}</Text>
              </View>
            </Card.Content>
          </Card>

          {/* ── Movement Control ────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#0b1e10' }]}>
                  <MaterialIcons name="open-with" size={20} color="#4caf50" />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>Movement Control</Text>
              </View>
              <Divider style={styles.divider} />

              <Text style={styles.sectionLabel}>Select Target Plot</Text>

              {/* Plot grid */}
              <View style={styles.plotGrid}>
                {plots.map((plot) => {
                  const isCurrent  = plot.id === robotPosition.currentPlot;
                  const isSelected = plot.id === selectedPlot;
                  const isTarget   = plot.id === robotPosition.targetPlot && isMoving;
                  const inactive   = plot.status === 'inactive';

                  let bgColor    = '#1a1a2e';
                  let borderColor = '#2a2a3e';
                  if (isCurrent)  { bgColor = '#0b1e10'; borderColor = '#4caf50'; }
                  if (isSelected && !isCurrent) { bgColor = '#0d1b2e'; borderColor = '#3b82f6'; }
                  if (isTarget && !isCurrent)   { bgColor = '#1f1200'; borderColor = '#ff9800'; }

                  return (
                    <TouchableOpacity
                      key={plot.id}
                      onPress={() => !isMoving && !sending && !inactive && setSelectedPlot(plot.id)}
                      disabled={isMoving || sending || inactive}
                      style={[styles.plotCard, { backgroundColor: bgColor, borderColor }, inactive && styles.inactivePlot]}
                    >
                      {isCurrent ? (
                        <MaterialIcons name="precision-manufacturing" size={22} color="#4caf50" style={styles.plotIcon} />
                      ) : isTarget ? (
                        <MaterialIcons name="my-location" size={22} color="#ff9800" style={styles.plotIcon} />
                      ) : isSelected ? (
                        <MaterialIcons name="radio-button-checked" size={22} color="#3b82f6" style={styles.plotIcon} />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={22} color={inactive ? '#333' : '#555'} style={styles.plotIcon} />
                      )}
                      <Text style={[styles.plotName, inactive && { color: '#444' }]}>{plot.name}</Text>
                      {isCurrent && <Text style={styles.plotTag}>Here</Text>}
                      {isTarget && !isCurrent && <Text style={[styles.plotTag, { color: '#ff9800' }]}>Target</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                {[
                  { color: '#4caf50', label: 'Current position' },
                  { color: '#3b82f6', label: 'Selected' },
                  { color: '#ff9800', label: 'Moving target' },
                ].map(({ color, label }) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>{label}</Text>
                  </View>
                ))}
              </View>

              <Divider style={styles.innerDivider} />

              {/* Action buttons */}
              <View style={styles.buttonGroup}>
                <Button
                  mode="contained"
                  onPress={handleMoveToPlot}
                  disabled={!canMove}
                  buttonColor="#3b82f6"
                  icon="play"
                  style={styles.btn}
                  loading={sending && selectedPlot !== null}
                >
                  {selectedPlot !== null ? `Move to Plot ${selectedPlot}` : 'Select a plot'}
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleReturnHome}
                  disabled={!canHome}
                  icon="home"
                  style={styles.btn}
                  textColor="#4caf50"
                >
                  Return to Plot 1
                </Button>


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
        {snackMsg}
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f0f1a' },
  content:         { padding: 16, paddingBottom: 40 },
  title:           { color: '#fff', marginBottom: 16, fontWeight: 'bold' },
  card:            { marginBottom: 16, backgroundColor: '#12121f', borderRadius: 14 },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIconWrap:    { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle:       { color: '#fff', fontWeight: '700', flex: 1 },
  divider:         { backgroundColor: '#1e1e2e', marginBottom: 12 },
  innerDivider:    { backgroundColor: '#1e1e2e', marginVertical: 12 },
  sectionLabel:    { color: '#888', fontSize: 13, marginBottom: 10 },
  // State badge row
  stateBadgeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  stateBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  stateDot:        { width: 8, height: 8, borderRadius: 4 },
  stateText:       { fontWeight: 'bold', fontSize: 13 },
  connBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connDot:         { width: 7, height: 7, borderRadius: 4 },
  connText:        { fontSize: 12, fontWeight: '600' },
  // Position
  positionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  positionBox:     { alignItems: 'center', flex: 1 },
  positionLabel:   { color: '#666', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  positionValue:   { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  // Last action
  lastActionRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  lastActionText:  { color: '#777', fontSize: 13, flex: 1, lineHeight: 18 },
  // Plot grid
  plotGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  plotCard:        { width: '47%', padding: 14, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  inactivePlot:    { opacity: 0.4 },
  plotIcon:        { marginBottom: 2 },
  plotName:        { color: '#fff', fontWeight: '600', fontSize: 14 },
  plotTag:         { color: '#4caf50', fontSize: 11, fontWeight: '600', marginTop: 2 },
  // Legend
  legend:          { flexDirection: 'row', gap: 14, marginBottom: 4, flexWrap: 'wrap' },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { color: '#555', fontSize: 11 },
  // Buttons
  buttonGroup:     { gap: 10 },
  btn:             { borderRadius: 10 },
  snackbar:        { backgroundColor: '#1a1a2e' },
});

export default RobotArmScreen;
