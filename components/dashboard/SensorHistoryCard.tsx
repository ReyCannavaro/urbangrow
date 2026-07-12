import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SensorData } from '@/services/sensorService';
import { formatHistoryTime, getTrend } from '@/utils/sensorHistory';

type SensorMetric = 'temperature' | 'ph';
type HistoryRange = '1h' | '24h' | '7d';

interface RangeOption {
  id: HistoryRange;
  label: string;
  hours: number;
}

const rangeOptions: RangeOption[] = [
  { id: '1h', label: '1 Jam', hours: 1 },
  { id: '24h', label: '24 Jam', hours: 24 },
  { id: '7d', label: '7 Hari', hours: 24 * 7 },
];

interface LineSensorChartProps {
  history: SensorData[];
  metric: SensorMetric;
  color: string;
  minValue: number;
  maxValue: number;
  safeMin: number;
  safeMax: number;
  unit?: string;
}

const CHART_HEIGHT = 118;
const CHART_PADDING = 10;
const MAX_CHART_POINTS = 40;

const sampleChartData = (history: SensorData[]) => {
  if (history.length <= MAX_CHART_POINTS) {
    return history;
  }

  const step = (history.length - 1) / (MAX_CHART_POINTS - 1);
  return Array.from({ length: MAX_CHART_POINTS }, (_, index) => history[Math.round(index * step)]);
};

const LineSensorChart: React.FC<LineSensorChartProps> = ({
  history,
  metric,
  color,
  minValue,
  maxValue,
  safeMin,
  safeMax,
  unit = '',
}) => {
  const [chartWidth, setChartWidth] = useState(0);
  const chartData = useMemo(() => sampleChartData(history), [history]);
  const range = Math.max(maxValue - minValue, 1);

  if (chartData.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Belum ada riwayat.</Text>
      </View>
    );
  }

  const onChartLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  const plotWidth = Math.max(chartWidth - CHART_PADDING * 2, 1);
  const plotHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const getPoint = (item: SensorData, index: number) => {
    const value = item[metric];
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / range));
    const x = CHART_PADDING + (chartData.length === 1 ? plotWidth / 2 : (index / (chartData.length - 1)) * plotWidth);
    const y = CHART_PADDING + (1 - normalizedValue) * plotHeight;
    return { x, y, value };
  };

  const points = chartData.map(getPoint);
  const safeTop = CHART_PADDING + (1 - Math.max(0, Math.min(1, (safeMax - minValue) / range))) * plotHeight;
  const safeBottom = CHART_PADDING + (1 - Math.max(0, Math.min(1, (safeMin - minValue) / range))) * plotHeight;

  return (
    <View>
      <View style={styles.chartValueRow}>
        <Text style={styles.chartAxisText}>
          {maxValue}
          {unit}
        </Text>
        <Text style={styles.safeZoneText}>
          Zona aman {safeMin}-{safeMax}
          {unit}
        </Text>
      </View>
      <View style={styles.lineChart} onLayout={onChartLayout}>
        <View
          style={[
            styles.safeZoneBand,
            {
              top: safeTop,
              height: Math.max(safeBottom - safeTop, 4),
            },
          ]}
        />
        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const deltaX = nextPoint.x - point.x;
          const deltaY = nextPoint.y - point.y;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX);

          return (
            <View
              key={`${metric}-line-${chartData[index].timestamp}-${index}`}
              style={[
                styles.chartLine,
                {
                  left: point.x,
                  top: point.y,
                  width: length,
                  backgroundColor: color,
                  transform: [{ rotateZ: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => (
          <View
            key={`${metric}-point-${chartData[index].timestamp}-${index}`}
            style={[
              styles.chartPoint,
              {
                left: point.x - 3,
                top: point.y - 3,
                borderColor: color,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.chartValueRow}>
        <Text style={styles.chartAxisText}>
          {minValue}
          {unit}
        </Text>
        <Text style={styles.chartAxisText}>{chartData.length} titik</Text>
      </View>
    </View>
  );
};

export const SensorHistoryCard: React.FC<{ history: SensorData[]; isConnected: boolean }> = ({
  history,
  isConnected,
}) => {
  const [selectedRange, setSelectedRange] = useState<HistoryRange>('24h');
  const selectedRangeOption = rangeOptions.find(option => option.id === selectedRange) ?? rangeOptions[1];

  const filteredHistory = useMemo(() => {
    const cutoff = Date.now() - selectedRangeOption.hours * 60 * 60 * 1000;
    return history.filter(item => {
      const timestamp = new Date(item.timestamp).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [history, selectedRangeOption.hours]);

  const chartHistory = filteredHistory.length ? filteredHistory : history.slice(-12);
  const latestRows = chartHistory.slice(-5).reverse();
  const tempTrend = getTrend(chartHistory, 'temperature');
  const phTrend = getTrend(chartHistory, 'ph');

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

      <View style={styles.rangeSelector}>
        {rangeOptions.map(option => {
          const isSelected = option.id === selectedRange;
          return (
            <Pressable
              key={option.id}
              onPress={() => setSelectedRange(option.id)}
              style={[styles.rangeButton, isSelected && styles.rangeButtonActive]}
            >
              <Text style={[styles.rangeButtonText, isSelected && styles.rangeButtonTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.trendGrid}>
        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Tren Suhu</Text>
          <Text style={[styles.trendValue, { color: tempTrend.color }]}>{tempTrend.label}</Text>
          <LineSensorChart
            history={chartHistory}
            metric="temperature"
            color="#3b82f6"
            minValue={10}
            maxValue={40}
            safeMin={20}
            safeMax={28.5}
            unit="°C"
          />
        </View>
        <View style={styles.trendBox}>
          <Text style={styles.trendLabel}>Tren pH</Text>
          <Text style={[styles.trendValue, { color: phTrend.color }]}>{phTrend.label}</Text>
          <LineSensorChart
            history={chartHistory}
            metric="ph"
            color="#10b981"
            minValue={4}
            maxValue={10}
            safeMin={6}
            safeMax={7.5}
          />
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
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  rangeButton: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  rangeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  rangeButtonText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  rangeButtonTextActive: {
    color: '#1f2937',
  },
  trendGrid: {
    marginBottom: 14,
  },
  trendBox: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 10,
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
  chartValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chartAxisText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
  },
  safeZoneText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  lineChart: {
    height: CHART_HEIGHT,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  safeZoneBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#dcfce7',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bbf7d0',
    opacity: 0.72,
  },
  chartLine: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 2,
    opacity: 0.86,
  },
  chartPoint: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  emptyChart: {
    height: CHART_HEIGHT,
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
