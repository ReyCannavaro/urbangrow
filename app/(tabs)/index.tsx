import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DataCard } from '@/components/dashboard/DataCard';
import { SensorHistoryCard } from '@/components/dashboard/SensorHistoryCard';
import { StatusButton } from '@/components/dashboard/StatusButton';
import { WaterConditionCard } from '@/components/dashboard/WaterConditionCard';
import { useDashboardData } from '@/hooks/use-dashboard-data';

const HEADER_GRADIENT = ['#3b82f6', '#10b981'] as const;

const HomePage: React.FC = () => {
  const {
    sensorData,
    sensorHistory,
    actuatorStatus,
    isLoading,
    isConnected,
    errorMessage,
    clearErrorMessage,
  } = useDashboardData();

  const currentTemp = sensorData.temperature || 0;
  const currentPh = sensorData.ph || 0;
  const connectionColor = isConnected ? '#16a34a' : '#dc2626';
  const connectionLabel = isConnected ? 'API Online' : 'Simulasi Lokal';
  const connectionIcon = isConnected ? 'wifi' : 'wifi-off';

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.customAlert}>
          <View style={styles.customAlertHeader}>
            <Feather name="wifi-off" size={18} color="#dc2626" />
            <Text style={styles.customAlertTitle}>Koneksi Gagal</Text>
          </View>
          <Text style={styles.customAlertMessage}>{errorMessage}</Text>
          <Text style={styles.customAlertButtonText} onPress={clearErrorMessage}>
            Tutup
          </Text>
        </View>
      ) : null}

      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerEyebrow}>Urban Farm 1</Text>
            <Text style={styles.headerText}>Sistem Monitoring</Text>
          </View>
          <View style={[styles.connectionChip, { backgroundColor: `${connectionColor}22` }]}>
            <Feather name={connectionIcon} size={14} color={connectionColor} />
            <Text style={[styles.connectionChipText, { color: connectionColor }]}>
              {connectionLabel}
            </Text>
          </View>
        </View>
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
            borderColor={actuatorStatus.pumpStatus === 'ON' ? '#10b981' : '#94a3b8'}
          />
          <StatusButton
            label="Lampu (LED Grow)"
            value={actuatorStatus.lightStatus}
            borderColor={actuatorStatus.lightStatus === 'ON' ? '#10b981' : '#94a3b8'}
          />
          <StatusButton label="Lele" value="27 Ekor" borderColor="#3b82f6" />
          <StatusButton label="Nila" value="27 Ekor" borderColor="#3b82f6" />
          <StatusButton label="Pakcoy" value="14 Hari" borderColor="#10b981" />
          <StatusButton label="Kangkung" value="17 Hari" borderColor="#10b981" />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: 25,
    marginBottom: 14,
    marginHorizontal: 16,
    borderRadius: 18,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerEyebrow: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  connectionChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectionChipText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 116,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 104,
  },
  customAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    margin: 16,
    marginTop: 50,
    padding: 14,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  customAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  customAlertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    marginLeft: 8,
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#b91c1c',
  },
  customAlertButtonText: {
    alignSelf: 'flex-end',
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
});
