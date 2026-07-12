import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { analyzeWaterCondition } from '@/utils/waterAnalysis';

interface WaterConditionCardProps {
  currentTemp: number;
  currentPh: number;
  isLoading: boolean;
  lastUpdate: string;
}

export const WaterConditionCard: React.FC<WaterConditionCardProps> = ({
  currentTemp,
  currentPh,
  isLoading,
  lastUpdate,
}) => {
  const { tempStatus, phStatus, conclusion, dynamicBorderColor } = useMemo(
    () => analyzeWaterCondition(currentTemp, currentPh),
    [currentTemp, currentPh],
  );

  const overallLabel = dynamicBorderColor === '#10b981'
    ? 'OPTIMAL'
    : dynamicBorderColor === '#ef4444'
      ? 'KRITIS'
      : 'WASPADA';

  if (isLoading && currentTemp === 0) {
    return (
      <View style={[styles.card, styles.oxygenCard, { borderColor: '#9ca3af' }]}>
        <View style={styles.loadingState}>
          <View style={styles.loadingIcon}>
            <Feather name="activity" size={22} color="#64748b" />
          </View>
          <View style={styles.loadingCopy}>
            <Text style={styles.loadingTitle}>Memuat data sensor</Text>
            <Text style={styles.loadingText}>Mengambil pembacaan terbaru dari API.</Text>
          </View>
        </View>
      </View>
    );
  }

  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const formattedTime = new Date(lastUpdate).toLocaleTimeString('id-ID', timeOptions);

  return (
    <View style={[styles.card, styles.oxygenCard, { borderColor: dynamicBorderColor }]}>
      <View style={styles.oxygenHeader}>
        <Text
          style={[
            styles.cardNormalLabel,
            { borderColor: dynamicBorderColor, color: dynamicBorderColor, backgroundColor: '#fff', fontSize: 12 },
          ]}
        >
          {overallLabel}
        </Text>
      </View>
      <View style={styles.oxygenContent}>
        <View style={[styles.oxygenRing, { borderColor: dynamicBorderColor }]}>
          <Feather name="cloud-drizzle" size={46} color={dynamicBorderColor} />
        </View>
        <View style={styles.oxygenDetails}>
          <Text style={styles.oxygenTitle}>Status Air (Update: {formattedTime})</Text>
          <Text style={styles.oxygenValue}>{tempStatus} / {phStatus}</Text>
        </View>
      </View>
      <Text style={styles.conclusionText}>{conclusion}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  cardNormalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  oxygenCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderColor: '#10b981',
    marginBottom: 16,
  },
  oxygenHeader: {
    alignItems: 'flex-end',
  },
  oxygenContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  oxygenRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  oxygenDetails: {
    flex: 1,
  },
  oxygenTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  oxygenValue: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 5,
    fontSize: 24,
    lineHeight: 30,
  },
  conclusionText: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 10,
    lineHeight: 18,
    paddingHorizontal: 5,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loadingCopy: {
    flex: 1,
  },
  loadingTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
