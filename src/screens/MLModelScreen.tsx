import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip, Button, ActivityIndicator, ProgressBar, Switch, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MLModelInfo } from '../types';
import {
  subscribeMLModelInfo,
  updateMLModelStatus,
  subscribeLightControl,
  updateLightControl,
  requestModelRetrain,
} from '../services/firebaseService';

// ─── Colour helpers ────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  good: '#4caf50',
  fair: '#ff9800',
  bad: '#ef4444',
};

const getLabelColor = (label?: string): string =>
  label ? (LABEL_COLORS[label.toLowerCase()] ?? '#9e9e9e') : '#9e9e9e';

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':   return '#4caf50';
    case 'inactive': return '#9e9e9e';
    case 'training': return '#ff9800';
    default:         return '#9e9e9e';
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────

const MLModelScreen: React.FC = () => {
  const [modelInfo, setModelInfo]     = useState<MLModelInfo | null>(null);
  const [isAutoMode, setIsAutoMode]   = useState(true);
  const [loading, setLoading]         = useState(true);
  const [retraining, setRetraining]   = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  useEffect(() => {
    const unsubscribeModel = subscribeMLModelInfo((data) => {
      if (data) {
        setModelInfo(data);
        if (data.status !== 'training') {
          setRetraining(false);
        }
      }
      setLoading(false);
    });

    const unsubscribeLight = subscribeLightControl((data) => {
      if (data) setIsAutoMode(data.isAuto);
    });

    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubscribeModel();
      unsubscribeLight();
      clearTimeout(timeout);
    };
  }, []);

  const handleStatusToggle = async () => {
    if (modelInfo) {
      const newStatus = modelInfo.status === 'active' ? 'inactive' : 'active';
      await updateMLModelStatus(newStatus);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await requestModelRetrain();
      setSnackMessage('Retrain request sent. Model status set to training.');
    } catch {
      setSnackMessage('Failed to send retrain request.');
      setRetraining(false);
    }
    setSnackVisible(true);
  };

  const handleAutoModeToggle = async (value: boolean) => {
    setIsAutoMode(value);
    await updateLightControl({ isAuto: value });
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading ML model data...</Text>
      </View>
    );
  }

  // ── No data state ────────────────────────────────────────────────────────────
  if (!modelInfo) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="robot-outline" size={60} color="#555" />
        <Text variant="titleLarge" style={styles.noDataText}>No ML Model Data</Text>
        <Text style={styles.noDataSubtext}>
          Initialize data from the Dashboard to see ML model information.
        </Text>
      </View>
    );
  }

  const { predictions } = modelInfo;
  const labelColor      = getLabelColor(predictions.label);
  const labelText       = predictions.label ? predictions.label.toUpperCase() : '—';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Hero / label banner ────────────────────────────────────────────── */}
        <View style={[styles.heroBanner, { shadowColor: labelColor }]}>
          {/* Label index badge */}
          {predictions.labelIndex !== undefined && (
            <View style={[styles.labelIndexBadge, { borderColor: labelColor }]}>
              <Text style={[styles.labelIndexText, { color: labelColor }]}>
                #{predictions.labelIndex}
              </Text>
            </View>
          )}

          <Text style={[styles.heroLabel, { color: labelColor }]}>{labelText}</Text>

          <View style={styles.heroMeta}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#888" />
            <Text style={styles.heroTimestamp}>
              {predictions.timestamp ?? 'No timestamp'}
            </Text>
          </View>
        </View>

        {/* ── Model info card ────────────────────────────────────────────────── */}
        <Card style={styles.card}>
          <Card.Content>
            {/* Name / version / status chip row */}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  {modelInfo.name ?? 'Mushroom ML Model'}
                </Text>
                <Text variant="bodySmall" style={styles.dimText}>
                  v{modelInfo.version ?? '1.0.0'}
                </Text>
              </View>
              <Chip
                style={[styles.statusChip, { borderColor: getStatusColor(modelInfo.status) }]}
                textStyle={{ color: getStatusColor(modelInfo.status), fontWeight: 'bold' }}
                mode="outlined"
              >
                {modelInfo.status.toUpperCase()}
              </Chip>
            </View>

            {/* Description */}
            <Text variant="bodyMedium" style={styles.description}>
              {modelInfo.description ?? 'AI-powered mushroom cultivation monitoring and prediction model.'}
            </Text>

            {/* Accuracy progress bar */}
            <View style={styles.rowLabel}>
              <Text variant="bodySmall" style={styles.dimText}>Model Accuracy</Text>
              <Text variant="bodySmall" style={{ color: '#4caf50', fontWeight: 'bold' }}>
                {modelInfo.accuracy}%
              </Text>
            </View>
            <ProgressBar
              progress={modelInfo.accuracy / 100}
              color="#4caf50"
              style={styles.progressBar}
            />

            {/* Date rows */}
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#888" />
              <Text style={styles.dimText}> Last trained: </Text>
              <Text style={styles.dateValue}>
                {new Date(modelInfo.lastTrainedDate).toLocaleDateString()}
              </Text>
            </View>
            {modelInfo.batchStartDate && (
              <View style={styles.dateRow}>
                <MaterialCommunityIcons name="calendar-start" size={16} color="#888" />
                <Text style={styles.dimText}> Batch start: </Text>
                <Text style={styles.dateValue}>{modelInfo.batchStartDate}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ── Predictions card ───────────────────────────────────────────────── */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionHeading}>Predictions</Text>

            {/* Label + labelIndex prominent display */}
            <View style={[styles.labelRow, { borderColor: labelColor + '44' }]}>
              <View style={styles.labelRowLeft}>
                <MaterialCommunityIcons name="tag-outline" size={18} color={labelColor} />
                <Text style={[styles.labelRowText, { color: labelColor }]}>
                  {predictions.label ?? '—'}
                </Text>
              </View>
              {predictions.labelIndex !== undefined && (
                <Text style={[styles.labelIndexInline, { color: labelColor }]}>
                  Index {predictions.labelIndex}
                </Text>
              )}
            </View>

            {/* Fruiting readiness — raw score */}
            <View style={styles.rowLabel}>
              <Text variant="bodySmall" style={styles.dimText}>Fruiting Readiness</Text>
              <Text variant="bodySmall" style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                {predictions.fruitingReadiness}
              </Text>
            </View>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${Math.min(100, (predictions.fruitingReadiness / 10) * 100)}%`,
                    backgroundColor: '#fbbf24',
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreNote}>Score out of 10</Text>

            {/* Health score — progress bar */}
            <View style={[styles.rowLabel, { marginTop: 12 }]}>
              <Text variant="bodySmall" style={styles.dimText}>Health Score</Text>
              <Text variant="bodySmall" style={{ color: '#4caf50', fontWeight: 'bold' }}>
                {predictions.healthScore}%
              </Text>
            </View>
            <ProgressBar
              progress={predictions.healthScore / 100}
              color="#4caf50"
              style={styles.progressBar}
            />

            {/* Estimated harvest date — plain string, no Date parsing */}
            <View style={[styles.harvestBox, { borderColor: labelColor + '55' }]}>
              <MaterialCommunityIcons name="sprout-outline" size={28} color={labelColor} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.dimText}>Estimated Harvest Date</Text>
                <Text style={styles.harvestValue}>
                  {predictions.estimatedHarvestDate}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* ── Features card ─────────────────────────────────────────────────── */}
        {(modelInfo.features ?? []).length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionHeading}>Input Features</Text>
              <View style={styles.featuresGrid}>
                {(modelInfo.features ?? []).map((feature, index) => (
                  <Chip key={index} mode="outlined" style={styles.featureChip} textStyle={styles.featureChipText}>
                    {feature}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* ── Controls card ─────────────────────────────────────────────────── */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionHeading}>Controls</Text>

            {/* Auto light toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={styles.switchLabel}>Auto Light Control</Text>
                <Text variant="bodySmall" style={styles.dimText}>
                  {isAutoMode ? 'ML model controls lighting' : 'Manual light control'}
                </Text>
              </View>
              <Switch value={isAutoMode} onValueChange={handleAutoModeToggle} color="#7c3aed" />
            </View>

            {/* Activate / Pause */}
            <Button
              mode="contained"
              onPress={handleStatusToggle}
              disabled={modelInfo.status === 'training'}
              style={styles.ctaButton}
              buttonColor={modelInfo.status === 'active' ? '#ff9800' : '#4caf50'}
              icon={modelInfo.status === 'active' ? 'pause' : 'play'}
            >
              {modelInfo.status === 'active' ? 'Pause Model' : 'Activate Model'}
            </Button>

            {/* Retrain */}
            <Button
              mode="outlined"
              onPress={handleRetrain}
              disabled={retraining || modelInfo.status === 'training'}
              style={styles.ctaButton}
              textColor="#7c3aed"
              icon={retraining || modelInfo.status === 'training' ? undefined : 'refresh'}
            >
              {retraining || modelInfo.status === 'training' ? (
                <View style={styles.retrainingContent}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text style={styles.retrainingText}> Training...</Text>
                </View>
              ) : (
                'Retrain Model'
              )}
            </Button>
          </Card.Content>
        </Card>

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

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#aaa',
  },
  noDataText: {
    color: '#fff',
    marginTop: 16,
  },
  noDataSubtext: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },

  // Hero banner
  heroBanner: {
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLabel: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 6,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  heroTimestamp: {
    color: '#666',
    fontSize: 12,
  },
  labelIndexBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  labelIndexText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Cards
  card: {
    backgroundColor: '#12121f',
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionHeading: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 14,
  },
  description: {
    color: '#aaa',
    marginBottom: 14,
    lineHeight: 20,
  },
  statusChip: {
    backgroundColor: 'transparent',
  },
  dimText: {
    color: '#888',
    fontSize: 12,
  },

  // Progress / rows
  rowLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#222',
  },

  // Date rows
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  dateValue: {
    color: '#ccc',
    fontSize: 13,
  },

  // Predictions
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  labelRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelRowText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  labelIndexInline: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreNote: {
    color: '#555',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  harvestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  harvestValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // Features
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    backgroundColor: 'transparent',
    borderColor: '#333',
  },
  featureChipText: {
    color: '#ccc',
    fontSize: 12,
  },

  // Controls
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    color: '#fff',
  },
  ctaButton: {
    marginBottom: 10,
    borderRadius: 8,
  },
  retrainingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retrainingText: {
    color: '#7c3aed',
    marginLeft: 6,
  },

  // Snackbar
  snackbar: {
    backgroundColor: '#1a1a2e',
  },
});

export default MLModelScreen;
