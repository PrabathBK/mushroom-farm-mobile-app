import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface SensorCardProps {
  title: string;
  value: number;
  unit: string;
  icon: 'temperature' | 'humidity' | 'co2' | 'moisture' | 'ph';
  color: string;
  minValue?: number;
  maxValue?: number;
  optimalMin?: number;
  optimalMax?: number;
}

const iconMap: Record<string, MaterialIconName> = {
  temperature: 'thermostat',
  humidity: 'opacity',
  co2: 'air',
  moisture: 'water-drop',
  ph: 'science',
};

const SensorCard: React.FC<SensorCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
  minValue = 0,
  maxValue = 100,
  optimalMin,
  optimalMax
}) => {
  const theme = useTheme();
  const iconName = iconMap[icon];
  const progress = ((value - minValue) / (maxValue - minValue)) * 100;
  
  const isOptimal = optimalMin !== undefined && optimalMax !== undefined
    ? value >= optimalMin && value <= optimalMax
    : true;

  const statusColor = isOptimal ? '#4caf50' : '#ff9800';

  return (
    <Card style={styles.card} elevation={3}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.valueContainer}>
            <Text variant="bodyMedium" style={styles.title}>
              {title}
            </Text>
            <View style={styles.valueRow}>
              <Text variant="headlineMedium" style={styles.value}>
                {value.toFixed(1)}
              </Text>
              <Text variant="bodyMedium" style={styles.unit}>
                {unit}
              </Text>
            </View>
          </View>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <MaterialIcons name={iconName} size={28} color={color} />
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(Math.max(progress, 0), 100)}%`,
                  backgroundColor: color,
                }
              ]}
            />
          </View>
          {optimalMin !== undefined && optimalMax !== undefined && (
            <View style={styles.rangeContainer}>
              <Text variant="bodySmall" style={styles.rangeText}>
                Range: {minValue} - {maxValue}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text variant="bodySmall" style={[styles.statusText, { color: statusColor }]}>
                  {isOptimal ? 'Optimal' : 'Warning'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  valueContainer: {
    flex: 1,
  },
  title: {
    opacity: 0.7,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: 'bold',
  },
  unit: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rangeText: {
    opacity: 0.7,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
  },
});

export default SensorCard;
