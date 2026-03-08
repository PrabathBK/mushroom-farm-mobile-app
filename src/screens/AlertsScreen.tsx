import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, Image, Modal, TouchableOpacity, FlatList, ListRenderItemInfo } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Alert } from '../types';
import {
  subscribeAlerts,
  acknowledgeAlert,
  markFalseAlarm,
} from '../services/firebaseService';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ── Alert card — memoised so only changed items re-render ────────────────────
interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onFalseAlarm: (id: string) => void;
  onImagePress: (uri: string) => void;
}

const getAlertIcon = (type: string): { name: MaterialIconName; color: string } => {
  switch (type) {
    case 'error':   return { name: 'error',         color: '#f44336' };
    case 'warning': return { name: 'warning',        color: '#fbbf24' };
    case 'success': return { name: 'check-circle',   color: '#4caf50' };
    case 'pest':    return { name: 'bug-report',     color: '#ec4899' };
    default:        return { name: 'info',           color: '#3b82f6' };
  }
};

const AlertCard = memo(({ alert, onAcknowledge, onFalseAlarm, onImagePress }: AlertCardProps) => {
  const iconInfo = getAlertIcon(alert.type);
  return (
    <Card style={[styles.alertCard, !alert.acknowledged && styles.unacknowledged]}>
      <Card.Content>
        <View style={styles.alertHeader}>
          <MaterialIcons name={iconInfo.name} size={24} color={iconInfo.color} />
          <Text variant="titleMedium" style={styles.alertType}>
            {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
          </Text>
          {!alert.acknowledged && (
            <Chip mode="flat" style={styles.newBadge}>New</Chip>
          )}
        </View>

        <Text variant="bodyMedium" style={styles.alertMessage}>
          {alert.message}
        </Text>

        {alert.image && (
          <TouchableOpacity onPress={() => onImagePress(alert.image!)}>
            <Image
              source={{
                uri: alert.image.startsWith('data:image')
                  ? alert.image
                  : `data:image/jpeg;base64,${alert.image}`
              }}
              style={styles.alertImage}
            />
          </TouchableOpacity>
        )}

        <Text variant="bodySmall" style={styles.timestamp}>
          {new Date(alert.timestamp).toLocaleString()}
        </Text>

        {!alert.acknowledged && (
          <View style={styles.actions}>
            {alert.type === 'pest' && (
              <Button
                mode="outlined"
                onPress={() => onFalseAlarm(alert.id)}
                style={styles.actionButton}
                icon="cancel"
              >
                False Alarm
              </Button>
            )}
            <Button
              mode="contained"
              onPress={() => onAcknowledge(alert.id)}
              style={styles.actionButton}
            >
              Acknowledge
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
});

// ── Screen ───────────────────────────────────────────────────────────────────
const RECENT_LIMIT = 20;

const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAlerts((data) => {
      // Sort newest-first, keep only the most recent RECENT_LIMIT
      const sorted = [...data]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, RECENT_LIMIT);
      setAlerts(sorted);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAcknowledge = useCallback(async (id: string) => {
    await acknowledgeAlert(id);
  }, []);

  const handleFalseAlarm = useCallback(async (id: string) => {
    await markFalseAlarm(id);
    await acknowledgeAlert(id);
  }, []);

  const handleImagePress = useCallback((uri: string) => {
    setSelectedImage(uri);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Alert>) => (
      <AlertCard
        alert={item}
        onAcknowledge={handleAcknowledge}
        onFalseAlarm={handleFalseAlarm}
        onImagePress={handleImagePress}
      />
    ),
    [handleAcknowledge, handleFalseAlarm, handleImagePress]
  );

  const keyExtractor = useCallback((item: Alert, index: number) => item.id || String(index), []);

  const ListHeader = (
    <View>
      <Text variant="headlineMedium" style={styles.title}>
        System Alerts
      </Text>
      {alerts.length > 0 && (
        <Text variant="bodySmall" style={styles.subtitle}>
          Showing {alerts.length} most recent alert{alerts.length !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );

  const ListEmpty = (
    <Card style={styles.emptyCard}>
      <Card.Content>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No alerts found in the system.
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading alerts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.content}
        // Performance tunings
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />

      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{
                uri: selectedImage.startsWith('data:image')
                  ? selectedImage
                  : `data:image/jpeg;base64,${selectedImage}`
              }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

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
    gap: 12,
  },
  loadingText: {
    color: '#9e9e9e',
    fontSize: 14,
  },
  title: {
    color: '#fff',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  emptyCard: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  alertCard: {
    marginBottom: 12,
  },
  unacknowledged: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertType: {
    flex: 1,
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#f44336',
  },
  alertMessage: {
    marginVertical: 8,
  },
  alertImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 8,
  },
  timestamp: {
    opacity: 0.5,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
});

export default AlertsScreen;
