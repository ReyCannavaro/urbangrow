import { Platform } from 'react-native';

type ApiProfile = 'deviceLan' | 'androidEmulator' | 'iosSimulator' | 'web';

export const API_BASE_URL_PROFILES: Record<ApiProfile, string> = {
  deviceLan: 'http://10.249.160.45:5000',
  androidEmulator: 'http://10.0.2.2:5000',
  iosSimulator: 'http://localhost:5000',
  web: 'http://localhost:5000',
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const getDefaultApiProfile = (): ApiProfile => {
  if (Platform.OS === 'web') {
    return 'web';
  }

  if (Platform.OS === 'ios') {
    return 'iosSimulator';
  }

  return 'deviceLan';
};

const getConfiguredApiProfile = (): ApiProfile => {
  const envProfile = process.env.EXPO_PUBLIC_API_PROFILE as ApiProfile | undefined;

  if (envProfile && API_BASE_URL_PROFILES[envProfile]) {
    return envProfile;
  }

  return getDefaultApiProfile();
};

export const API_PROFILE = getConfiguredApiProfile();
export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || API_BASE_URL_PROFILES[API_PROFILE],
);
export const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

export type ActuatorKey = 'pumpStatus' | 'lightStatus';
export type ActuatorValue = 'ON' | 'OFF';

export interface ActuatorStatus {
  pumpStatus: ActuatorValue;
  lightStatus: ActuatorValue;
}

export type ActuatorCommandStatus = 'pending' | 'success' | 'failed';

export interface ActuatorCommand {
  id: number;
  device_id: string;
  actuator_key: ActuatorKey;
  target_value: ActuatorValue;
  status: ActuatorCommandStatus;
  delivery_method: 'queue' | 'http' | string;
  attempts: number;
  error_message?: string | null;
  requested_by: string;
  requested_at: string;
  delivered_at?: string | null;
  completed_at?: string | null;
  payload?: {
    command_id: number;
    device_id: string;
    key: ActuatorKey;
    value: ActuatorValue;
    mqtt_topic: string;
    requested_at: string;
  };
}

export interface ActuatorControlResponse {
  message: string;
  command: ActuatorCommand;
  actuator: ActuatorStatus;
}

export const apiGet = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API ${path} returned status ${response.status}`);
  }

  return response.json();
};

export const apiPost = async <T,>(path: string, body: unknown): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (API_TOKEN) {
    headers['X-API-Token'] = API_TOKEN;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API ${path} returned status ${response.status}`);
  }

  return response.json();
};

export const normalizeActuatorStatus = (payload: Partial<ActuatorStatus>): ActuatorStatus => ({
  pumpStatus: payload.pumpStatus === 'ON' ? 'ON' : 'OFF',
  lightStatus: payload.lightStatus === 'ON' ? 'ON' : 'OFF',
});
