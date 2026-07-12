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
```

Do not prefix backend secrets with `EXPO_PUBLIC_`.
