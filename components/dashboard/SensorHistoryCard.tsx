import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SensorData } from '@/services/sensorService';
import { formatHistoryTime, getTrend } from '@/utils/sensorHistory';

interface MiniBarChartProps {
  history: SensorData[];
  metric: 'temperature' | 'ph';
  color: string;
  minValue: number;
  maxValue: number;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({ history, metric, color, minValue, maxValue }) => {
  const chartData = history.slice(-8);
  const range = Math.max(maxValue - minValue, 1);

  if (chartData.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Belum ada riwayat.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartRow}>
      {chartData.map((item, index) => {
        const value = item[metric];
        const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / range));
        const height = 18 + normalizedValue * 52;

        return (
          <View key={`${metric}-${item.timestamp}-${index}`} style={styles.chartBarWrapper}>
            <View style={[styles.chartBar, { height, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
};

export const SensorHistoryCard: React.FC<{ history: SensorData[]; isConnected: boolean }> = ({
  history,
  isConnected,
}) => {
  const latestRows = history.slice(-5).reverse();
  const tempTrend = getTrend(history, 'temperature');
  const phTrend = getTrend(history, 'ph');

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyTitle}>Riwayat Sensor</Text>
          <Text style={styles.historySubtitle}>{isConnected ? 'Data API terakhir' : 'Mode simulasi lokal'}</Text>
        </View>
        <Text
          style={[
            styles.cardNormalLabel,
            {
              borderColor: isConnected ? '#10b981' : '#ef4444',
              color: isConnected ? '#10b981' : '#ef4444',
              backgroundColor: '#fff',
            },
          ]}
        >
          {history.length} Data
        </Text>
      </View>

      <View style={styles.trendGrid}>
        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Tren Suhu</Text>
          <Text style={[styles.trendValue, { color: tempTrend.color }]}>{tempTrend.label}</Text>
          <MiniBarChart history={history} metric="temperature" color="#3b82f6" minValue={15} maxValue={35} />
        </View>
        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Tren pH</Text>
          <Text style={[styles.trendValue, { color: phTrend.color }]}>{phTrend.label}</Text>
          <MiniBarChart history={history} metric="ph" color="#10b981" minValue={4} maxValue={9} />
        </View>
      </View>

      <View style={styles.historyTable}>
        <View style={styles.historyTableHeader}>
          <Text style={[styles.historyCell, styles.historyHeaderCell]}>Waktu</Text>
          <Text style={[styles.historyCell, styles.historyHeaderCell]}>Suhu</Text>
          <Text style={[styles.historyCell, styles.historyHeaderCell]}>pH</Text>
          <Text style={[styles.historyCell, styles.historyHeaderCell]}>LDR</Text>
        </View>
        {latestRows.length === 0 ? (
          <Text style={styles.historyEmptyText}>Belum ada riwayat sensor.</Text>
        ) : (
          latestRows.map((item, index) => (
            <View key={`${item.timestamp}-${index}`} style={styles.historyTableRow}>
              <Text style={styles.historyCell}>{formatHistoryTime(item.timestamp)}</Text>
              <Text style={styles.historyCell}>{item.temperature.toFixed(1)}°C</Text>
              <Text style={styles.historyCell}>{item.ph.toFixed(2)}</Text>
              <Text style={styles.historyCell}>{item.ldr_value}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  cardNormalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  trendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  trendBox: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  trendLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    marginBottom: 8,
  },
  chartRow: {
    height: 74,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBarWrapper: {
    flex: 1,
    height: 74,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 1,
  },
  chartBar: {
    width: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  emptyChart: {
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  historyTable: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
  },
  historyTableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  historyCell: {
    flex: 1,
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
  },
  historyHeaderCell: {
    color: '#374151',
    fontWeight: 'bold',
  },
  historyEmptyText: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
