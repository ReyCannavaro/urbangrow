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

export type ActuatorKey = 'pumpStatus' | 'lightStatus';
export type ActuatorValue = 'ON' | 'OFF';

export interface ActuatorStatus {
  pumpStatus: ActuatorValue;
  lightStatus: ActuatorValue;
}

export const apiGet = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API ${path} returned status ${response.status}`);
  }

  return response.json();
};

export const apiPost = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
