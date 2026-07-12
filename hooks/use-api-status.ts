import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, DeviceSyncStatus, DeviceSyncResponse } from '@/constants/api';

const API_STATUS_INTERVAL_MS = 15000;
const SENSOR_STALE_MINUTES = 5;
const AUTO_SYNC_COOLDOWN_MS = 120000;

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
  const [syncStatus, setSyncStatus] = useState<DeviceSyncStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const lastAutoSyncAtRef = useRef<number>(0);

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

      const syncStatusResponse = await apiGet<DeviceSyncStatus>('/api/sync-status');
      setSyncStatus(syncStatusResponse);

      const shouldAutoSync = syncStatusResponse.is_stale && Date.now() - lastAutoSyncAtRef.current > AUTO_SYNC_COOLDOWN_MS;
      if (shouldAutoSync) {
        lastAutoSyncAtRef.current = Date.now();
        try {
          const syncResponse = await apiPost<DeviceSyncResponse>('/api/sync-device', {
            trigger: 'auto-stale',
            reason: syncStatusResponse.reason,
          });
          setSyncStatus(syncResponse.sync_status);
        } catch (syncError) {
          console.warn('Auto sync request failed:', syncError);
        }
      }
    } catch (error) {
      console.warn('API health check failed:', error);
      setIsOnline(false);
      setIsSensorStale(false);
      setSensorStaleMinutes(null);
      setSyncStatus(null);
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
    syncStatus,
    isChecking,
    lastCheckedAt,
    checkApiStatus,
  };
};
