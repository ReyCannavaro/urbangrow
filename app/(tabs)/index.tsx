import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DataCard } from '@/components/dashboard/DataCard';
import { SensorHistoryCard } from '@/components/dashboard/SensorHistoryCard';
import { StatusButton } from '@/components/dashboard/StatusButton';
import { WaterConditionCard } from '@/components/dashboard/WaterConditionCard';
import { GlassBackground } from '@/components/ui/GlassBackground';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AppTheme } from '@/constants/theme';
import { useDashboardData } from '@/hooks/use-dashboard-data';

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
  const connectionColor = isConnected ? AppTheme.color.primary : AppTheme.color.danger;
  const connectionLabel = isConnected ? 'API Online' : 'Simulasi Lokal';
  const connectionIcon = isConnected ? 'wifi' : 'wifi-off';

  return (
    <View style={styles.container}>
      <GlassBackground />
      {errorMessage ? (
        <GlassPanel style={styles.customAlert} contentStyle={styles.customAlertContent} intensity={70} variant="strong">
          <View style={styles.customAlertHeader}>
            <Feather name="wifi-off" size={18} color={AppTheme.color.danger} />
            <Text style={styles.customAlertTitle}>Koneksi Gagal</Text>
          </View>
          <Text style={styles.customAlertMessage}>{errorMessage}</Text>
          <Text style={styles.customAlertButtonText} onPress={clearErrorMessage}>
            Tutup
          </Text>
        </GlassPanel>
      ) : null}

      <GlassPanel style={styles.header} contentStyle={styles.headerInner} intensity={72} variant="strong">
        <View style={styles.headerContent}>
          <View style={styles.brandMark}>
            <Feather name="cpu" size={22} color={AppTheme.color.primaryDark} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Urban Farm 1</Text>
            <Text style={styles.headerText}>Field Console</Text>
            <Text style={styles.headerSubtext}>Monitoring air, aktuator, dan riwayat sensor.</Text>
          </View>
        </View>
        <View style={[styles.connectionChip, { backgroundColor: `${connectionColor}1f`, borderColor: `${connectionColor}55` }]}>
          <Feather name={connectionIcon} size={14} color={connectionColor} />
          <Text style={[styles.connectionChipText, { color: connectionColor }]}>
            {connectionLabel}
          </Text>
        </View>
      </GlassPanel>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dataRow}>
          <DataCard
            title="Suhu Air"
            value={currentTemp.toFixed(1)}
            unit="°C"
            iconName="thermometer"
            bgColor={AppTheme.color.infoSoft}
            iconColor={AppTheme.color.info}
            borderColor={AppTheme.color.info}
          />
          <DataCard
            title="PH Air"
            value={currentPh.toFixed(2)}
            unit=""
            iconName="droplet"
            bgColor={AppTheme.color.primarySoft}
            iconColor={AppTheme.color.primary}
            borderColor={AppTheme.color.primary}
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
          <View>
            <Text style={styles.statusTitle}>Kontrol Aktuator</Text>
            <Text style={styles.statusSubtitle}>Perangkat, ikan, dan umur tanaman.</Text>
          </View>
          <View style={styles.statusHeaderIcon}>
            <Feather name="zap" size={18} color={AppTheme.color.primaryDark} />
          </View>
        </View>

        <View style={styles.statusGrid}>
          <StatusButton
            label="Pompa Air"
            value={actuatorStatus.pumpStatus}
            borderColor={actuatorStatus.pumpStatus === 'ON' ? AppTheme.color.primary : AppTheme.color.neutral}
          />
          <StatusButton
            label="Lampu (LED Grow)"
            value={actuatorStatus.lightStatus}
            borderColor={actuatorStatus.lightStatus === 'ON' ? AppTheme.color.primary : AppTheme.color.neutral}
          />
          <StatusButton label="Lele" value="27 Ekor" borderColor={AppTheme.color.info} />
          <StatusButton label="Nila" value="27 Ekor" borderColor={AppTheme.color.info} />
          <StatusButton label="Pakcoy" value="14 Hari" borderColor={AppTheme.color.primary} />
          <StatusButton label="Kangkung" value="17 Hari" borderColor={AppTheme.color.primary} />
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
    backgroundColor: AppTheme.color.canvas,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 25,
    marginBottom: 14,
    marginHorizontal: 16,
    borderRadius: AppTheme.radius.panel,
    minHeight: 144,
  },
  headerInner: {
    padding: 18,
    minHeight: 144,
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.color.primarySoft,
    borderWidth: 1,
    borderColor: AppTheme.color.lineStrong,
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    color: AppTheme.color.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  headerText: {
    fontSize: 26,
    fontWeight: '900',
    color: AppTheme.color.text,
    letterSpacing: 0,
  },
  headerSubtext: {
    color: AppTheme.color.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '600',
  },
  connectionChip: {
    alignSelf: 'flex-start',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    marginTop: 16,
  },
  connectionChipText: {
    fontSize: 12,
    fontWeight: '900',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: AppTheme.color.textOnGlass,
  },
  statusSubtitle: {
    fontSize: 12,
    color: AppTheme.color.textOnGlassMuted,
    marginTop: 3,
    fontWeight: '700',
  },
  statusHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,255,251,0.82)',
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
    backgroundColor: 'transparent',
    borderColor: '#f4b7ae',
    borderWidth: 1,
    borderRadius: AppTheme.radius.card,
    shadowColor: AppTheme.color.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  customAlertContent: {
    padding: 14,
  },
  customAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  customAlertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.color.danger,
    marginLeft: 8,
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#8f332b',
  },
  customAlertButtonText: {
    alignSelf: 'flex-end',
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.color.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
});
