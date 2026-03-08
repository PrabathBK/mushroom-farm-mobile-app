import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Image } from 'react-native';
import { Text, ActivityIndicator, Button, Card, Chip } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { CurrentSensorValues, SensorData } from '../types';
import { subscribeCurrentSensorValues, subscribeSensorData, subscribeCameraFrame } from '../services/firebaseService';
import SensorCard from '../components/Shared/SensorCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DashboardScreen: React.FC = () => {
  const [currentValues, setCurrentValues] = useState<CurrentSensorValues>({
    ph: 0,
    moisture: 0,
    co2: 0,
    humidity: 0,
    temperature: 0
  });
  const [temperatureData, setTemperatureData] = useState<SensorData[]>([]);
  const [humidityData, setHumidityData] = useState<SensorData[]>([]);
  const [co2Data, setCo2Data] = useState<SensorData[]>([]);
  const [moistureData, setMoistureData] = useState<SensorData[]>([]);
  const [phData, setPhData] = useState<SensorData[]>([]);
  const [cameraFrame, setCameraFrame] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔥 DashboardScreen: Setting up Firebase listeners...');
    
    const unsubscribeCurrent = subscribeCurrentSensorValues((data) => {
      console.log('📊 Received current sensor values:', data);
      setCurrentValues(data);
      setLoading(false);
    });

    const unsubscribeTemp = subscribeSensorData('temperature', (data) => {
      console.log(`🌡️ Received temperature history: ${data.length} readings`);
      setTemperatureData(data);
    });
    
    const unsubscribeHum = subscribeSensorData('humidity', (data) => {
      console.log(`💧 Received humidity history: ${data.length} readings`);
      setHumidityData(data);
    });
    
    const unsubscribeCo2 = subscribeSensorData('co2', (data) => {
      console.log(`🌫️ Received CO2 history: ${data.length} readings`);
      setCo2Data(data);
    });
    
    const unsubscribeMoist = subscribeSensorData('moisture', (data) => {
      console.log(`💦 Received moisture history: ${data.length} readings`);
      setMoistureData(data);
    });
    
    const unsubscribePh = subscribeSensorData('ph', (data) => {
      console.log(`⚗️ Received pH history: ${data.length} readings`);
      setPhData(data);
    });
    
    const unsubscribeCamera = subscribeCameraFrame((frame) => {
      console.log(`📷 Received camera frame: ${frame ? frame.substring(0, 50) + '...' : 'empty'}`);
      setCameraFrame(frame);
    });

    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      console.log('🔥 DashboardScreen: Cleaning up Firebase listeners...');
      unsubscribeCurrent();
      unsubscribeTemp();
      unsubscribeHum();
      unsubscribeCo2();
      unsubscribeMoist();
      unsubscribePh();
      unsubscribeCamera();
      clearTimeout(timeout);
    };
  }, []);

  const prepareChartData = (data: SensorData[]) => {
    if (data.length === 0) return { labels: [''], datasets: [{ data: [0] }] };
    
    const limitedData = data.slice(-10); // Last 10 points for mobile
    return {
      labels: limitedData.map(() => ''),
      datasets: [
        {
          data: limitedData.map(d => d.value),
        }
      ]
    };
  };

  const chartConfig = {
    backgroundColor: '#1a1a2e',
    backgroundGradientFrom: '#1a1a2e',
    backgroundGradientTo: '#16213e',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3b82f6'
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading sensor data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Mushroom Farm Dashboard
        </Text>

        {/* Camera Feed Section */}
        <Card style={styles.cameraCard}>
          <Card.Content>
            <View style={styles.cameraHeader}>
              <Text variant="titleLarge" style={styles.cameraTitle}>
                Live Camera Feed
              </Text>
              <Chip
                icon={() => (
                  <MaterialCommunityIcons 
                    name="record-circle" 
                    size={12} 
                    color={cameraFrame && cameraFrame.length > 30 ? '#4caf50' : '#f44336'} 
                  />
                )}
                style={[
                  styles.statusChip,
                  { backgroundColor: cameraFrame && cameraFrame.length > 30 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)' }
                ]}
                textStyle={{ 
                  color: cameraFrame && cameraFrame.length > 30 ? '#4caf50' : '#f44336',
                  fontWeight: 'bold',
                  fontSize: 11
                }}
              >
                {cameraFrame && cameraFrame.length > 30 ? 'LIVE' : 'OFFLINE'}
              </Chip>
            </View>
            
            <View style={styles.cameraContainer}>
              {cameraFrame && cameraFrame.length > 30 ? (
                <Image
                  source={{ 
                    uri: cameraFrame.startsWith('data:image') 
                      ? cameraFrame 
                      : `data:image/jpeg;base64,${cameraFrame}` 
                  }}
                  style={styles.cameraImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="camera-off" size={40} color="#f44336" />
                  </View>
                  <Text variant="titleMedium" style={styles.placeholderTitle}>
                    No Video Signal
                  </Text>
                  <Text variant="bodySmall" style={styles.placeholderText}>
                    Camera feed is currently unavailable.{'\n'}Check ESP32-CAM connection.
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.cameraFooter}>
              <Text variant="labelSmall" style={styles.footerText}>
                Resolution: 640x480 | Format: MJPEG
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Text variant="headlineMedium" style={styles.sectionTitle}>
          Current Sensor Values
        </Text>

        <SensorCard
          title="Temperature"
          value={currentValues.temperature}
          unit="C"
          icon="temperature"
          color="#ff6b6b"
          minValue={10}
          maxValue={40}
          optimalMin={20}
          optimalMax={28}
        />
        
        <SensorCard
          title="Humidity"
          value={currentValues.humidity}
          unit="%"
          icon="humidity"
          color="#4ecdc4"
          minValue={0}
          maxValue={100}
          optimalMin={80}
          optimalMax={95}
        />

        <SensorCard
          title="CO2 Level"
          value={currentValues.co2}
          unit="ppm"
          icon="co2"
          color="#a78bfa"
          minValue={0}
          maxValue={2000}
          optimalMin={500}
          optimalMax={1000}
        />

        <SensorCard
          title="Moisture"
          value={currentValues.moisture}
          unit="%"
          icon="moisture"
          color="#60a5fa"
          minValue={0}
          maxValue={100}
          optimalMin={65}
          optimalMax={85}
        />

        <SensorCard
          title="pH Level"
          value={currentValues.ph}
          unit="pH"
          icon="ph"
          color="#fbbf24"
          minValue={0}
          maxValue={14}
          optimalMin={6.0}
          optimalMax={7.0}
        />

        <Text variant="headlineMedium" style={styles.sectionTitle}>
          Sensor Trends
        </Text>

        {temperatureData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>Temperature</Text>
            <LineChart
              data={prepareChartData(temperatureData)}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {humidityData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>Humidity</Text>
            <LineChart
              data={prepareChartData(humidityData)}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {co2Data.length > 0 && (
          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>CO2 Level</Text>
            <LineChart
              data={prepareChartData(co2Data)}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {moistureData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>Moisture</Text>
            <LineChart
              data={prepareChartData(moistureData)}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {phData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>pH Level</Text>
            <LineChart
              data={prepareChartData(phData)}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
  },
  title: {
    color: '#fff',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    marginVertical: 16,
    fontWeight: 'bold',
  },
  cameraCard: {
    backgroundColor: '#1a1a2e',
    marginBottom: 16,
    borderRadius: 12,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  cameraContainer: {
    backgroundColor: '#0a0a14',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraImage: {
    width: '100%',
    height: 250,
  },
  cameraPlaceholder: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  cameraFooter: {
    marginTop: 8,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chartContainer: {
    marginVertical: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    color: '#fff',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default DashboardScreen;
