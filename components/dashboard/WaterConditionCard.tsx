import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { analyzeWaterCondition } from '@/utils/waterAnalysis';
import { AppTheme } from '@/constants/theme';

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
  const statusColor = dynamicBorderColor === '#ef4444'
    ? AppTheme.color.danger
    : dynamicBorderColor === '#10b981'
      ? AppTheme.color.primary
      : AppTheme.color.warning;
  const statusSoftColor = dynamicBorderColor === '#ef4444'
    ? AppTheme.color.dangerSoft
    : dynamicBorderColor === '#10b981'
      ? AppTheme.color.primarySoft
      : AppTheme.color.warningSoft;

  if (isLoading && currentTemp === 0) {
    return (
      <View style={[styles.card, styles.oxygenCard]}>
        <View style={styles.loadingState}>
          <View style={styles.loadingIcon}>
            <Feather name="activity" size={22} color={AppTheme.color.textMuted} />
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
    <View style={[styles.card, styles.oxygenCard]}>
      <View style={styles.oxygenHeader}>
        <View>
          <Text style={styles.oxygenKicker}>Water condition</Text>
          <Text style={styles.oxygenTitle}>Status Air</Text>
        </View>
        <Text
          style={[
            styles.cardNormalLabel,
            { borderColor: statusColor, color: statusColor, backgroundColor: statusSoftColor },
          ]}
        >
          {overallLabel}
        </Text>
      </View>
      <View style={styles.oxygenContent}>
        <View style={[styles.oxygenRing, { borderColor: statusColor, backgroundColor: statusSoftColor }]}>
          <Feather name="cloud-drizzle" size={40} color={statusColor} />
        </View>
        <View style={styles.oxygenDetails}>
          <Text style={styles.oxygenMeta}>Update {formattedTime}</Text>
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
    borderRadius: AppTheme.radius.panel,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.color.line,
    backgroundColor: AppTheme.color.surface,
  },
  cardNormalLabel: {
    fontSize: 11,
    fontWeight: '900',
    borderWidth: 1,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  oxygenCard: {
    width: '100%',
    marginBottom: 16,
  },
  oxygenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  oxygenContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  oxygenRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  oxygenDetails: {
    flex: 1,
  },
  oxygenKicker: {
    fontSize: 12,
    color: AppTheme.color.textSubtle,
    fontWeight: '800',
  },
  oxygenTitle: {
    fontSize: 18,
    color: AppTheme.color.text,
    fontWeight: '900',
    marginTop: 2,
  },
  oxygenMeta: {
    fontSize: 12,
    color: AppTheme.color.textSubtle,
    fontWeight: '700',
  },
  oxygenValue: {
    fontWeight: '900',
    color: AppTheme.color.text,
    marginTop: 5,
    fontSize: 24,
    lineHeight: 30,
  },
  conclusionText: {
    fontSize: 13,
    color: AppTheme.color.textMuted,
    lineHeight: 19,
    padding: 12,
    borderRadius: AppTheme.radius.input,
    backgroundColor: AppTheme.color.surfaceMuted,
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
    backgroundColor: AppTheme.color.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loadingCopy: {
    flex: 1,
  },
  loadingTitle: {
    color: AppTheme.color.text,
    fontSize: 14,
    fontWeight: '800',
  },
  loadingText: {
    color: AppTheme.color.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
