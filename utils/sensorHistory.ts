import { SensorData } from '@/services/sensorService';

export interface SensorTrend {
  label: string;
  color: string;
}

export const getTrend = (history: SensorData[], key: 'temperature' | 'ph'): SensorTrend => {
  if (history.length < 2) {
    return { label: 'Belum cukup data', color: '#6b7280' };
  }

  const firstValue = history[0][key];
  const lastValue = history[history.length - 1][key];
  const delta = lastValue - firstValue;
  const threshold = key === 'temperature' ? 0.2 : 0.05;

  if (delta > threshold) {
    return { label: 'Naik', color: '#f59e0b' };
  }

  if (delta < -threshold) {
    return { label: 'Turun', color: '#3b82f6' };
  }

  return { label: 'Stabil', color: '#10b981' };
};

export const formatHistoryTime = (timestamp: string): string => {
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return new Date(timestamp).toLocaleTimeString('id-ID', timeOptions);
};
