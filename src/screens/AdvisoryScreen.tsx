import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator as RNActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Text, Card, Chip, Divider, Snackbar, ProgressBar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { CurrentSensorValues, MLModelInfo, LightControl, Alert } from '../types';
import {
  subscribeCurrentSensorValues,
  subscribeMLModelInfo,
  subscribeLightControl,
  subscribeAlerts,
} from '../services/firebaseService';
import {
  getMushroomAdvisory,
  FarmSummary,
  AdvisoryItem,
  Severity,
  Priority,
  FarmContext,
} from '../services/geminiService';

// ─── Constants ────────────────────────────────────────────────────────────────

const OPTIMAL: Record<string, { min: number; max: number; unit: string; label: string }> = {
  temperature: { min: 15, max: 24, unit: '°C',   label: 'Temperature' },
  humidity:    { min: 80, max: 95, unit: '%',    label: 'Humidity' },
  co2:         { min: 0,  max: 1000, unit: ' ppm', label: 'CO₂' },
  moisture:    { min: 65, max: 75, unit: '%',    label: 'Moisture' },
  ph:          { min: 6.0, max: 7.0, unit: '',   label: 'pH' },
};

const SEV_COLOR: Record<Severity, string> = {
  good:     '#4caf50',
  warning:  '#ff9800',
  critical: '#ef4444',
};

const SEV_BG: Record<Severity, string> = {
  good:     '#0d2b0d',
  warning:  '#2b1a00',
  critical: '#2b0000',
};

const SEV_BORDER: Record<Severity, string> = {
  good:     '#1e4d1e',
  warning:  '#4d2e00',
  critical: '#4d0000',
};

const PRI_COLOR: Record<Priority, string> = {
  immediate: '#ef4444',
  today:     '#ff9800',
  monitor:   '#3b82f6',
};

const PRI_LABEL: Record<Priority, string> = {
  immediate: 'Act Now',
  today:     'Today',
  monitor:   'Monitor',
};

const PRI_ICON: Record<Priority, string> = {
  immediate: 'error',
  today:     'schedule',
  monitor:   'visibility',
};

const CAT_ICON: Record<string, { name: string; lib: 'mat' | 'com' }> = {
  'Temperature':    { name: 'thermostat',          lib: 'mat' },
  'Humidity':       { name: 'water-percent',        lib: 'com' },
  'CO2':            { name: 'air',                  lib: 'mat' },
  'Substrate':      { name: 'grass',                lib: 'mat' },
  'pH':             { name: 'science',              lib: 'mat' },
  'Lighting':       { name: 'wb-sunny',             lib: 'mat' },
  'Pest & Disease': { name: 'bug-report',           lib: 'mat' },
  'Harvest':        { name: 'agriculture',          lib: 'mat' },
  'General':        { name: 'lightbulb',            lib: 'mat' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sensorSeverity(key: string, value: number): Severity {
  const r = OPTIMAL[key];
  if (!r) return 'good';
  if (value === 0 && key === 'moisture') return 'warning';
  if (value < r.min || value > r.max) {
    const delta = Math.abs(value < r.min ? r.min - value : value - r.max);
    return delta > (r.max - r.min) * 0.2 ? 'critical' : 'warning';
  }
  return 'good';
}

function CatIcon({ category, color, size }: { category: string; color: string; size: number }) {
  const def = CAT_ICON[category] ?? { name: 'eco', lib: 'mat' };
  if (def.lib === 'com') {
    return <MaterialCommunityIcons name={def.name as any} size={size} color={color} />;
  }
  return <MaterialIcons name={def.name as any} size={size} color={color} />;
}

// ─── Health score ring ────────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const color =
    score >= 75 ? '#4caf50' :
    score >= 50 ? '#ff9800' :
    '#ef4444';

  const label =
    score >= 75 ? 'Good' :
    score >= 50 ? 'Fair' :
    'At Risk';

  return (
    <View style={ringStyles.wrap}>
      <View style={[ringStyles.ring, { borderColor: color }]}>
        <Text style={[ringStyles.score, { color }]}>{score}</Text>
        <Text style={[ringStyles.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 28, fontWeight: 'bold', lineHeight: 32 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

// ─── Sensor mini-chip grid ────────────────────────────────────────────────────
function SensorGrid({ sensors }: { sensors: CurrentSensorValues }) {
  const entries = Object.entries(OPTIMAL) as [string, typeof OPTIMAL[string]][];
  return (
    <View style={gridStyles.grid}>
      {entries.map(([key, meta]) => {
        const val = (sensors as any)[key] as number;
        const sev = sensorSeverity(key, val);
        return (
          <View key={key} style={[gridStyles.cell, { borderColor: SEV_BORDER[sev], backgroundColor: SEV_BG[sev] }]}>
            <Text style={[gridStyles.val, { color: SEV_COLOR[sev] }]}>{val}{meta.unit}</Text>
            <Text style={gridStyles.lbl}>{meta.label}</Text>
            <View style={[gridStyles.dot, { backgroundColor: SEV_COLOR[sev] }]} />
          </View>
        );
      })}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cell: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  val:  { fontSize: 16, fontWeight: 'bold' },
  lbl:  { fontSize: 11, color: '#888', textAlign: 'center' },
  dot:  { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
});

// ─── Spinning analyse animation ───────────────────────────────────────────────
function AnalysingView() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={analysing.wrap}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <MaterialCommunityIcons name="atom" size={52} color="#3b82f6" />
      </Animated.View>
      <Text style={analysing.title}>Analysing farm data…</Text>
      <Text style={analysing.sub}>Gemini is reading your sensors, ML predictions{'\n'}and recent alerts to build tailored advice.</Text>
    </View>
  );
}

const analysing = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 40, gap: 14 },
  title: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  sub:   { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

// ─── Expandable advisory card ─────────────────────────────────────────────────
const AdvisoryCard = React.memo(({ item, index }: { item: AdvisoryItem; index: number }) => {
  const [expanded, setExpanded] = useState(index === 0); // first card open by default
  const sevColor  = SEV_COLOR[item.severity] ?? '#9e9e9e';
  const sevBg     = SEV_BG[item.severity]    ?? '#161624';
  const sevBorder = SEV_BORDER[item.severity] ?? '#333';
  const priColor  = PRI_COLOR[item.priority]  ?? '#3b82f6';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded(e => !e)}
      style={[acStyles.card, { borderLeftColor: sevColor, backgroundColor: sevBg, borderColor: sevBorder }]}
    >
      {/* Header row */}
      <View style={acStyles.header}>
        <View style={[acStyles.iconWrap, { backgroundColor: sevColor + '22' }]}>
          <CatIcon category={item.category} color={sevColor} size={20} />
        </View>

        <View style={acStyles.headerText}>
          <View style={acStyles.titleRow}>
            <Text style={acStyles.title} numberOfLines={expanded ? 0 : 2}>{item.title}</Text>
          </View>
          <View style={acStyles.chips}>
            <View style={[acStyles.priChip, { backgroundColor: priColor + '22', borderColor: priColor + '55' }]}>
              <MaterialIcons name={PRI_ICON[item.priority] as any} size={11} color={priColor} />
              <Text style={[acStyles.priLabel, { color: priColor }]}>{PRI_LABEL[item.priority]}</Text>
            </View>
            <View style={[acStyles.sevChip, { backgroundColor: sevColor + '22', borderColor: sevColor + '55' }]}>
              <Text style={[acStyles.sevLabel, { color: sevColor }]}>{item.severity.toUpperCase()}</Text>
            </View>
            <Text style={acStyles.catLabel}>{item.category}</Text>
          </View>
        </View>

        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color="#555"
        />
      </View>

      {/* Expanded body */}
      {expanded && (
        <View style={acStyles.body}>
          <Divider style={[acStyles.divider, { backgroundColor: sevBorder }]} />

          {/* Situation */}
          <Text style={acStyles.situation}>{item.situation}</Text>

          {/* Steps */}
          {item.steps && item.steps.length > 0 && (
            <View style={acStyles.stepsBlock}>
              <View style={acStyles.stepsHeader}>
                <MaterialIcons name="checklist" size={15} color={sevColor} />
                <Text style={[acStyles.stepsTitle, { color: sevColor }]}>What to do</Text>
              </View>
              {item.steps.map((step, i) => (
                <View key={i} style={acStyles.stepRow}>
                  <View style={[acStyles.stepNum, { backgroundColor: sevColor }]}>
                    <Text style={acStyles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={acStyles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Expected outcome */}
          {!!item.expectedOutcome && (
            <View style={[acStyles.outcomeBox, { borderColor: sevColor + '44' }]}>
              <MaterialIcons name="trending-up" size={14} color={sevColor} />
              <Text style={[acStyles.outcomeText, { color: sevColor + 'cc' }]}>
                {item.expectedOutcome}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const acStyles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    paddingLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  headerText: { flex: 1, minWidth: 0, gap: 5 },
  titleRow: { flexDirection: 'row' },
  title: { color: '#f0f0f0', fontWeight: '700', fontSize: 14, flex: 1, lineHeight: 20 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  priChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priLabel: { fontSize: 10, fontWeight: '700' },
  sevChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sevLabel: { fontSize: 10, fontWeight: '700' },
  catLabel: { color: '#666', fontSize: 11 },
  body: { marginTop: 10 },
  divider: { marginBottom: 10 },
  situation: { color: '#bbb', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  stepsBlock: { gap: 8, marginBottom: 12 },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  stepsTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  stepText: { flex: 1, color: '#ddd', fontSize: 13, lineHeight: 19 },
  outcomeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  outcomeText: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
});

// ─── Filter tab bar ───────────────────────────────────────────────────────────
type Tab = 'all' | 'critical' | 'warning' | 'good';

function TabBar({ active, counts, onChange }: {
  active: Tab;
  counts: Record<Tab, number>;
  onChange: (t: Tab) => void;
}) {
  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'all',      label: 'All',      color: '#3b82f6' },
    { key: 'critical', label: 'Critical', color: '#ef4444' },
    { key: 'warning',  label: 'Warning',  color: '#ff9800' },
    { key: 'good',     label: 'Good',     color: '#4caf50' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tabStyles.scroll}>
      <View style={tabStyles.row}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[
              tabStyles.tab,
              active === t.key && { backgroundColor: t.color + '22', borderColor: t.color },
            ]}
          >
            <Text style={[tabStyles.label, { color: active === t.key ? t.color : '#666' }]}>
              {t.label}
            </Text>
            {counts[t.key] > 0 && (
              <View style={[tabStyles.badge, { backgroundColor: active === t.key ? t.color : '#333' }]}>
                <Text style={tabStyles.badgeText}>{counts[t.key]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const tabStyles = StyleSheet.create({
  scroll: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: { fontSize: 13, fontWeight: '600' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ dataReady }: { dataReady: boolean }) {
  return (
    <View style={emptyStyles.wrap}>
      <MaterialCommunityIcons name="mushroom-outline" size={72} color="#2a2a3a" />
      <Text style={emptyStyles.title}>
        {dataReady ? 'Ready to Analyse' : 'Connecting to Farm…'}
      </Text>
      <Text style={emptyStyles.sub}>
        {dataReady
          ? 'Tap "Analyse Farm" to get AI-powered cultivation advice tailored to your current sensor readings.'
          : 'Waiting for live data from Firebase. This usually takes a few seconds.'}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 },
  title: { color: '#555', fontSize: 18, fontWeight: 'bold' },
  sub:   { color: '#444', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const AdvisoryScreen: React.FC = () => {
  const [sensors,      setSensors]      = useState<CurrentSensorValues | null>(null);
  const [mlModel,      setMlModel]      = useState<MLModelInfo | null>(null);
  const [lightControl, setLightControl] = useState<LightControl | null>(null);
  const [alerts,       setAlerts]       = useState<Alert[]>([]);

  const [summary,     setSummary]     = useState<FarmSummary | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [dataReady,   setDataReady]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab,   setActiveTab]   = useState<Tab>('all');
  const [snackMsg,    setSnackMsg]    = useState('');
  const [snackVis,    setSnackVis]    = useState(false);

  // Firebase subscriptions
  useEffect(() => {
    const u1 = subscribeCurrentSensorValues(d => { setSensors(d); setDataReady(true); });
    const u2 = subscribeMLModelInfo(d => setMlModel(d));
    const u3 = subscribeLightControl(d => setLightControl(d));
    const u4 = subscribeAlerts(d => setAlerts(d));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const handleAnalyse = useCallback(async () => {
    if (!sensors) {
      setSnackMsg('Waiting for sensor data from Firebase…');
      setSnackVis(true);
      return;
    }
    setLoading(true);
    try {
      const ctx: FarmContext = { sensors, mlModel, lightControl, recentAlerts: alerts };
      const result = await getMushroomAdvisory(ctx);
      setSummary(result);
      setLastUpdated(new Date());
      setActiveTab('all');
    } catch (err: any) {
      console.error('Advisory error:', err);
      setSnackMsg(`Error: ${err.message ?? 'Failed to get advisory'}`);
      setSnackVis(true);
    } finally {
      setLoading(false);
    }
  }, [sensors, mlModel, lightControl, alerts]);

  // Filter items by tab
  const allItems = summary?.items ?? [];
  const tabCounts: Record<Tab, number> = {
    all:      allItems.length,
    critical: allItems.filter(i => i.severity === 'critical').length,
    warning:  allItems.filter(i => i.severity === 'warning').length,
    good:     allItems.filter(i => i.severity === 'good').length,
  };
  const visibleItems =
    activeTab === 'all'
      ? allItems
      : allItems.filter(i => i.severity === activeTab);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ───────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>Farm Advisory</Text>
            <Text style={styles.heroSub}>AI-powered cultivation guidance</Text>
            {lastUpdated && (
              <Text style={styles.heroTime}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          {summary && <HealthRing score={summary.healthScore} />}
        </View>

        {/* ── Sensor grid ───────────────────────────────────────────── */}
        {sensors && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialIcons name="sensors" size={18} color="#3b82f6" />
                <Text style={styles.cardTitle}>Live Conditions</Text>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <SensorGrid sensors={sensors} />
            </Card.Content>
          </Card>
        )}

        {/* ── ML & overall situation ────────────────────────────────── */}
        {summary && (
          <Card style={[styles.card, styles.situationCard]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialIcons name="smart-toy" size={18} color="#a78bfa" />
                <Text style={styles.cardTitle}>Farm Situation</Text>
                {summary.daysToHarvest != null && (
                  <View style={styles.harvestChip}>
                    <MaterialIcons name="agriculture" size={12} color="#4caf50" />
                    <Text style={styles.harvestLabel}>
                      Harvest in {summary.daysToHarvest}d
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.situationText}>{summary.overallSituation}</Text>

              {mlModel && (
                <View style={styles.mlRow}>
                  <View style={styles.mlItem}>
                    <Text style={styles.mlItemLabel}>Fruiting</Text>
                    <ProgressBar
                      progress={Math.min(1, (mlModel.predictions?.fruitingReadiness ?? 0) / 10)}
                      color="#fbbf24"
                      style={styles.mlBar}
                    />
                    <Text style={[styles.mlItemVal, { color: '#fbbf24' }]}>
                      {mlModel.predictions?.fruitingReadiness ?? '—'}/10
                    </Text>
                  </View>
                  <View style={styles.mlItem}>
                    <Text style={styles.mlItemLabel}>Health</Text>
                    <ProgressBar
                      progress={(mlModel.predictions?.healthScore ?? 0) / 100}
                      color="#4caf50"
                      style={styles.mlBar}
                    />
                    <Text style={[styles.mlItemVal, { color: '#4caf50' }]}>
                      {mlModel.predictions?.healthScore ?? '—'}%
                    </Text>
                  </View>
                  <View style={styles.mlItem}>
                    <Text style={styles.mlItemLabel}>AI Score</Text>
                    <ProgressBar
                      progress={summary.healthScore / 100}
                      color={summary.healthScore >= 75 ? '#4caf50' : summary.healthScore >= 50 ? '#ff9800' : '#ef4444'}
                      style={styles.mlBar}
                    />
                    <Text style={[styles.mlItemVal, {
                      color: summary.healthScore >= 75 ? '#4caf50' : summary.healthScore >= 50 ? '#ff9800' : '#ef4444',
                    }]}>
                      {summary.healthScore}%
                    </Text>
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* ── Analyse button ────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.analyseBtn,
            (loading || !dataReady) && styles.analyseBtnDisabled,
          ]}
          onPress={handleAnalyse}
          disabled={loading || !dataReady}
          activeOpacity={0.8}
        >
          {loading ? (
            <RNActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="auto-fix-high" size={20} color="#fff" />
          )}
          <Text style={styles.analyseBtnText}>
            {loading
              ? 'Analysing…'
              : summary
              ? 'Re-analyse Farm'
              : 'Analyse Farm'}
          </Text>
        </TouchableOpacity>

        {/* ── Loading state ─────────────────────────────────────────── */}
        {loading && <AnalysingView />}

        {/* ── Advisory items ────────────────────────────────────────── */}
        {!loading && summary && allItems.length > 0 && (
          <View>
            {/* Issue summary strip */}
            <View style={styles.issueSummary}>
              {tabCounts.critical > 0 && (
                <View style={[styles.issuePill, { backgroundColor: '#2b0000', borderColor: '#4d0000' }]}>
                  <MaterialIcons name="error" size={13} color="#ef4444" />
                  <Text style={[styles.issuePillText, { color: '#ef4444' }]}>
                    {tabCounts.critical} critical
                  </Text>
                </View>
              )}
              {tabCounts.warning > 0 && (
                <View style={[styles.issuePill, { backgroundColor: '#2b1a00', borderColor: '#4d2e00' }]}>
                  <MaterialIcons name="warning" size={13} color="#ff9800" />
                  <Text style={[styles.issuePillText, { color: '#ff9800' }]}>
                    {tabCounts.warning} warnings
                  </Text>
                </View>
              )}
              {tabCounts.good > 0 && (
                <View style={[styles.issuePill, { backgroundColor: '#0d2b0d', borderColor: '#1e4d1e' }]}>
                  <MaterialIcons name="check-circle" size={13} color="#4caf50" />
                  <Text style={[styles.issuePillText, { color: '#4caf50' }]}>
                    {tabCounts.good} good
                  </Text>
                </View>
              )}
            </View>

            <TabBar active={activeTab} counts={tabCounts} onChange={setActiveTab} />

            {visibleItems.map((item, i) => (
              <AdvisoryCard key={`${item.category}-${i}`} item={item} index={i} />
            ))}

            {visibleItems.length === 0 && (
              <View style={styles.noItems}>
                <Text style={styles.noItemsText}>No {activeTab} items</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Empty / waiting state ─────────────────────────────────── */}
        {!loading && !summary && <EmptyState dataReady={dataReady} />}
      </ScrollView>

      <Snackbar
        visible={snackVis}
        onDismiss={() => setSnackVis(false)}
        duration={4000}
        style={styles.snackbar}
      >
        {snackMsg}
      </Snackbar>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a14' },
  content:     { padding: 16, paddingBottom: 48 },

  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLeft:  { flex: 1 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  heroSub:   { color: '#666', fontSize: 13, marginTop: 2 },
  heroTime:  { color: '#3b82f6', fontSize: 11, marginTop: 4 },

  card: {
    marginBottom: 12,
    backgroundColor: '#12121f',
    borderRadius: 14,
  },
  situationCard: { backgroundColor: '#0e0e1e' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 },

  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d2b0d',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50' },
  liveText: { color: '#4caf50', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  harvestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d2b0d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  harvestLabel: { color: '#4caf50', fontSize: 11, fontWeight: '700' },

  situationText: { color: '#bbb', fontSize: 13, lineHeight: 21, marginBottom: 14 },

  mlRow:       { flexDirection: 'row', gap: 10 },
  mlItem:      { flex: 1, gap: 4 },
  mlItemLabel: { color: '#777', fontSize: 11 },
  mlBar:       { height: 5, borderRadius: 3 },
  mlItemVal:   { fontSize: 13, fontWeight: 'bold' },

  analyseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  analyseBtnDisabled: { backgroundColor: '#1a1a2e', opacity: 0.6 },
  analyseBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  issueSummary: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  issuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  issuePillText: { fontSize: 12, fontWeight: '700' },

  noItems:     { alignItems: 'center', paddingVertical: 24 },
  noItemsText: { color: '#444', fontSize: 14 },

  snackbar: { backgroundColor: '#1a1a2e' },
});

export default AdvisoryScreen;
