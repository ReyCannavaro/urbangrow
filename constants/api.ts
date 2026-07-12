export const API_BASE_URL = 'http://10.249.160.45:5000';

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
