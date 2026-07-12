import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL, ActuatorStatus } from '@/constants/api';
import {
  fetchDashboardSnapshot,
  getSimulatedDashboardSnapshot,
  SensorData,
} from '@/services/sensorService';

const POLLING_INTERVAL_MS = 3000;

export const useDashboardData = () => {
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

    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    sensorData,
    sensorHistory,
    actuatorStatus,
    isLoading,
    isConnected,
    errorMessage,
    clearErrorMessage: () => setErrorMessage(''),
  };
};
