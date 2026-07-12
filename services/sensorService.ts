import { ActuatorStatus, apiGet, normalizeActuatorStatus } from '@/constants/api';

export interface SensorData {
  temperature: number;
  ph: number;
  ldr_value: number;
  timestamp: string;
}

export interface DashboardSnapshot {
  sensor: SensorData;
  actuator: ActuatorStatus;
  history: SensorData[];
}

let simulatedSensorData: SensorData = {
  temperature: 25.5,
  ph: 6.8,
  ldr_value: 450,
  timestamp: new Date().toISOString(),
};

let simulatedActuatorStatus: ActuatorStatus = {
  pumpStatus: 'OFF',
  lightStatus: 'OFF',
};

export const normalizeSensorData = (payload: any): SensorData => ({
  temperature: Number(payload.temperature ?? 0),
  ph: Number(payload.ph ?? 0),
  ldr_value: Number(payload.ldr_value ?? payload.ldr ?? 0),
  timestamp: payload.timestamp ?? new Date().toISOString(),
});

export const normalizeSensorHistory = (payload: any[]): SensorData[] => (
  payload.map(normalizeSensorData).reverse()
);

export const fetchDashboardSnapshot = async (): Promise<DashboardSnapshot> => {
  const [latestReading, actuatorData, historyData] = await Promise.all([
    apiGet<SensorData>('/api/latest-reading'),
    apiGet<ActuatorStatus>('/api/actuator-status'),
    apiGet<SensorData[]>('/api/sensor-history?limit=1000&hours=168'),
  ]);

  const sensor = normalizeSensorData(latestReading);
  const history = normalizeSensorHistory(historyData);

  return {
    sensor,
    actuator: normalizeActuatorStatus(actuatorData),
    history: history.length ? history : [sensor],
  };
};

export const getSimulatedDashboardSnapshot = (): Omit<DashboardSnapshot, 'history'> => {
  const tempChange = (Math.random() - 0.5) * 0.2;
  const phChange = (Math.random() - 0.5) * 0.05;

  let pumpStatus: ActuatorStatus['pumpStatus'] = simulatedActuatorStatus.pumpStatus;
  if (
    simulatedSensorData.temperature > 28.5 ||
    simulatedSensorData.temperature < 20 ||
    simulatedSensorData.ph < 6 ||
    simulatedSensorData.ph > 7.5
  ) {
    pumpStatus = 'ON';
  } else if (
    simulatedSensorData.temperature >= 20 &&
    simulatedSensorData.temperature <= 28 &&
    simulatedSensorData.ph >= 6.5 &&
    simulatedSensorData.ph <= 7
  ) {
    pumpStatus = 'OFF';
  }

  const lightStatus: ActuatorStatus['lightStatus'] = simulatedSensorData.ldr_value < 300 ? 'ON' : 'OFF';

  simulatedSensorData = {
    temperature: Number((simulatedSensorData.temperature + tempChange).toFixed(2)),
    ph: Number((simulatedSensorData.ph + phChange).toFixed(2)),
    ldr_value: simulatedSensorData.ldr_value,
    timestamp: new Date().toISOString(),
  };

  simulatedActuatorStatus = { pumpStatus, lightStatus };

  return {
    sensor: simulatedSensorData,
    actuator: simulatedActuatorStatus,
  };
};
