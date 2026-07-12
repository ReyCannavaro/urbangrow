import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/constants/api';

const API_STATUS_INTERVAL_MS = 15000;
const SENSOR_STALE_MINUTES = 5;

interface ApiHealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

interface LatestReadingResponse {
  timestamp?: string;
  source?: string;
}

const getMinutesSinceSensorUpdate = (timestamp?: string) => {
  if (!timestamp) {
    return null;
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - parsedTimestamp.getTime()) / 60000);
};

export const useApiStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSensorStale, setIsSensorStale] = useState(false);
  const [sensorStaleMinutes, setSensorStaleMinutes] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const checkApiStatus = useCallback(async () => {
    setIsChecking(true);

    try {
      const health = await apiGet<ApiHealthResponse>('/api/health');
      setIsOnline(health.status === 'ok');

      const latestReading = await apiGet<LatestReadingResponse>('/api/latest-reading');
      const staleMinutes = getMinutesSinceSensorUpdate(latestReading.timestamp);
      const hasDefaultSensorData = latestReading.source === 'default';

      setSensorStaleMinutes(staleMinutes);
      setIsSensorStale(
        hasDefaultSensorData ||
        staleMinutes === null ||
        staleMinutes > SENSOR_STALE_MINUTES,
      );
    } catch (error) {
      console.warn('API health check failed:', error);
      setIsOnline(false);
      setIsSensorStale(false);
      setSensorStaleMinutes(null);
    } finally {
      setLastCheckedAt(new Date());
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkApiStatus();

    const intervalId = setInterval(checkApiStatus, API_STATUS_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkApiStatus]);

  return {
    isOnline,
    isSensorStale,
    sensorStaleMinutes,
    isChecking,
    lastCheckedAt,
    checkApiStatus,
  };
};
