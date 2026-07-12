import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DataCard } from '@/components/dashboard/DataCard';
import { SensorHistoryCard } from '@/components/dashboard/SensorHistoryCard';
import { StatusButton } from '@/components/dashboard/StatusButton';
import { WaterConditionCard } from '@/components/dashboard/WaterConditionCard';
import { API_BASE_URL, ActuatorStatus } from '@/constants/api';
import {
  fetchDashboardSnapshot,
  getSimulatedDashboardSnapshot,
  SensorData,
} from '@/services/sensorService';

const HEADER_GRADIENT = ['#3b82f6', '#10b981'] as const;

const HomePage: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    ph: 0,
    ldr_value: 0,
    timestamp: new Date().toISOString(),
  });
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({
    pumpStatus: 'OFF',
    lightStatus: 'OFF',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const { sensor, actuator, history } = await fetchDashboardSnapshot();

      setSensorData(sensor);
      setSensorHistory(history);
      setActuatorStatus(actuator);
      setIsConnected(true);
      setErrorMessage('');
    } catch (error) {
      console.warn('API unavailable, using local simulation:', error);
      const { sensor, actuator } = getSimulatedDashboardSnapshot();

      setSensorData(sensor);
      setSensorHistory(prev => [...prev.slice(-11), sensor]);
      setActuatorStatus(actuator);
      setIsConnected(false);

      if (isLoading) {
        setErrorMessage(`Tidak dapat terhubung ke server API di ${API_BASE_URL}. Aplikasi ini menggunakan SIMULASI DATA LOKAL.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 3000);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  const currentTemp = sensorData.temperature || 0;
  const currentPh = sensorData.ph || 0;
  const headerStatus = isConnected ? '🟢 (API)' : '🔴 (Simulasi)';

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.customAlert}>
          <Text style={styles.customAlertTitle}>Koneksi Gagal 🔴</Text>
          <Text style={styles.customAlertMessage}>{errorMessage}</Text>
          <View style={styles.customAlertButtonContainer}>
            <Text style={styles.customAlertButtonText} onPress={() => setErrorMessage('')}>
              OK
            </Text>
          </View>
        </View>
      ) : null}

      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerText}>Sistem Aktif : Urban Farm 1 {headerStatus}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dataRow}>
          <DataCard
            title="Suhu Air"
            value={currentTemp.toFixed(1)}
            unit="°C"
            iconName="thermometer"
            bgColor="#e0f2fe"
            iconColor="#3b82f6"
            borderColor="#3b82f6"
          />
          <DataCard
            title="PH Air"
            value={currentPh.toFixed(2)}
            unit=""
            iconName="droplet"
            bgColor="#dcfce7"
            iconColor="#10b981"
            borderColor="#10b981"
          />
        </View>

        <WaterConditionCard
          currentTemp={currentTemp}
          currentPh={currentPh}
          isLoading={isLoading}
          lastUpdate={sensorData.timestamp}
        />

        <SensorHistoryCard history={sensorHistory} isConnected={isConnected} />

        <View style={styles.statusHeader}>
          <Feather name="zap" size={20} color="#6366f1" />
          <Text style={styles.statusTitle}>Kontrol Aktuator</Text>
        </View>

        <View style={styles.statusGrid}>
          <StatusButton
            label="Pompa Air"
            value={actuatorStatus.pumpStatus}
            borderColor={actuatorStatus.pumpStatus === 'ON' ? '#ef4444' : '#6b7280'}
          />
          <StatusButton
            label="Lampu (LED Grow)"
            value={actuatorStatus.lightStatus}
            borderColor={actuatorStatus.lightStatus === 'ON' ? '#f59e0b' : '#6b7280'}
          />
          <StatusButton label="Lele" value="27 Ekor" borderColor="#3b82f6" />
          <StatusButton label="Nila" value="27 Ekor" borderColor="#3b82f6" />
          <StatusButton label="Pakcoy" value="14 Hari" borderColor="#10b981" />
          <StatusButton label="Kangkung" value="17 Hari" borderColor="#10b981" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingTop: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    margin: 20,
    marginTop: 50,
    padding: 15,
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 10,
  },
  customAlertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 5,
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#b91c1c',
  },
  customAlertButtonContainer: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  customAlertButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
