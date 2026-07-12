# UrbanGrow API Configuration

The mobile app reads API configuration from `constants/api.ts`.

## Recommended Local Setup

Copy `.env.example` to `.env`, then pick one option:

```bash
EXPO_PUBLIC_API_PROFILE=deviceLan
```

Available profiles:

| Profile | URL | Use case |
| --- | --- | --- |
| `deviceLan` | `http://10.249.160.45:5000` | Expo Go on a physical phone using the same Wi-Fi as the backend |
| `androidEmulator` | `http://10.0.2.2:5000` | Android emulator connecting to backend on the host laptop |
| `iosSimulator` | `http://localhost:5000` | iOS simulator connecting to backend on the host laptop |
| `web` | `http://localhost:5000` | Expo web |

## Override With a Custom IP

If your laptop IP changes, use:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
```

`EXPO_PUBLIC_API_BASE_URL` takes priority over `EXPO_PUBLIC_API_PROFILE`.

## Backend Environment

The backend runs on port `5000` by default:

```bash
python API\app.py
```

Optional backend variables:

```bash
set URBANGROW_API_HOST=0.0.0.0
set URBANGROW_API_PORT=5000
set GEMINI_API_KEY=your_gemini_api_key_here
set URBANGROW_API_TOKEN=change-this-local-token
set URBANGROW_RATE_LIMIT_WINDOW_SECONDS=60
set URBANGROW_RATE_LIMIT_MAX_REQUESTS=120
set URBANGROW_MAX_JSON_BODY_BYTES=8192
set URBANGROW_ESP_HTTP_CONTROL_URL=http://192.168.1.50/actuator
set URBANGROW_DEFAULT_DEVICE_ID=esp32-main
set URBANGROW_MQTT_COMMAND_TOPIC=urbangrow/actuator/commands
```

Do not prefix backend secrets with `EXPO_PUBLIC_`.

If `URBANGROW_API_TOKEN` is set, protected POST endpoints require:

```text
X-API-Token: change-this-local-token
```

For local Expo testing only, mirror it to:

```bash
EXPO_PUBLIC_API_TOKEN=change-this-local-token
```

## ESP Actuator Integration

The backend supports two actuator delivery modes:

- HTTP push: set `URBANGROW_ESP_HTTP_CONTROL_URL`; backend POSTs each command to the ESP.
- HTTP polling: leave the URL empty; ESP polls `/api/actuator-commands/next?device_id=esp32-main`, executes the command, then POSTs `/api/actuator-commands/ack`.

Command status values are `pending`, `success`, and `failed`. The app only treats the physical actuator state as changed after a command succeeds.
