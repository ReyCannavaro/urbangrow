# UrbanGrow App

UrbanGrow adalah aplikasi monitoring dan kontrol urban farming/aquaponik berbasis Expo React Native. Aplikasi ini menampilkan data sensor air, status aktuator, riwayat sensor, notifikasi kondisi sistem, kontrol perangkat, input sensor manual untuk testing, dan chatbot AgriBot.

## Fitur Utama

- Dashboard suhu air, pH, LDR, status air, dan aktuator.
- Riwayat sensor dengan mini chart suhu dan pH.
- Kontrol pompa air dan lampu grow melalui API.
- Input sensor manual untuk testing tanpa alat IoT.
- Notifikasi real dari kondisi sensor dan aktuator.
- AgriBot untuk pertanyaan seputar aquaponik, hidroponik, dan urban farming.
- Backend Python standard library dengan SQLite, tanpa dependency tambahan.

## Struktur Project

```text
app/(tabs)/
  index.tsx          Dashboard monitoring
  explore.tsx        Kontrol perangkat dan input sensor manual
  notifications.tsx  Notifikasi sistem
  chatbot.tsx        AgriBot
API/
  app.py             Backend API Python + SQLite
constants/
  api.ts             Konfigurasi API frontend
docs/
  API_CONFIGURATION.md
```

## Prasyarat

- Node.js dan npm.
- Python 3.10+.
- Expo Go atau emulator Android/iOS.

Backend tidak membutuhkan `pip install` karena menggunakan standard library Python.

## Setup Frontend

Install dependency:

```bash
npm install
```

Salin konfigurasi env:

```bash
copy .env.example .env
```

Pilih profile API di `.env`:

```bash
EXPO_PUBLIC_API_PROFILE=deviceLan
```

Untuk override IP backend langsung:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
```

Profile yang tersedia:

| Profile | URL | Kegunaan |
| --- | --- | --- |
| `deviceLan` | `http://10.249.160.45:5000` | HP fisik satu Wi-Fi dengan backend |
| `androidEmulator` | `http://10.0.2.2:5000` | Android emulator |
| `iosSimulator` | `http://localhost:5000` | iOS simulator |
| `web` | `http://localhost:5000` | Expo web |

Detail tambahan ada di [docs/API_CONFIGURATION.md](docs/API_CONFIGURATION.md).

## Run Backend

Jalankan API:

```bash
python API\app.py
```

Default backend:

```text
Host: 0.0.0.0
Port: 5000
Database: API/urban_grow.db
```

Opsional:

```bash
set URBANGROW_API_HOST=0.0.0.0
set URBANGROW_API_PORT=5000
set URBANGROW_DATABASE_PATH=API\urban_grow.db
```

Security ringan opsional:

```bash
set URBANGROW_API_TOKEN=change-this-local-token
set URBANGROW_RATE_LIMIT_WINDOW_SECONDS=60
set URBANGROW_RATE_LIMIT_MAX_REQUESTS=120
set URBANGROW_MAX_JSON_BODY_BYTES=8192
```

Jika `URBANGROW_API_TOKEN` diisi, endpoint POST sensitif seperti sensor, kontrol aktuator, ack command, dan clear notifikasi wajib mengirim header:

```text
X-API-Token: change-this-local-token
```

Untuk aplikasi Expo lokal/demo, samakan token frontend:

```bash
EXPO_PUBLIC_API_TOKEN=change-this-local-token
```

## Setup Gemini Untuk AgriBot

API key Gemini tidak disimpan di frontend. Set key di backend:

```bash
set GEMINI_API_KEY=your_gemini_api_key_here
python API\app.py
```

Alternatif:

```bash
set GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Opsional ganti model:

```bash
set GEMINI_MODEL=gemini-2.5-flash
```

Jangan memakai prefix `EXPO_PUBLIC_` untuk secret backend.

## Run App

Start Expo:

```bash
npm run start
```

Target lain:

```bash
npm run android
npm run ios
npm run web
```

## Endpoint API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/health` | Cek status API |
| `POST` | `/api/sensor-readings` | Simpan data sensor |
| `POST` | `/api/update-sensor` | Alias input sensor |
| `POST` | `/receive_data` | Kompatibilitas endpoint IoT lama |
| `GET` | `/api/latest-reading` | Ambil data sensor terbaru |
| `GET` | `/api/sensor-history?limit=1000&hours=24` | Ambil riwayat sensor |
| `GET` | `/api/sensor-log` | Alias riwayat sensor |
| `GET` | `/api/actuator-status` | Ambil status pompa/lampu |
| `POST` | `/api/actuator-control` | Buat command kontrol aktuator |
| `GET` | `/api/actuator-commands?limit=20` | Ambil riwayat command aktuator |
| `GET` | `/api/actuator-commands/next?device_id=esp32-main` | ESP mengambil command pending berikutnya |
| `POST` | `/api/actuator-commands/ack` | ESP mengirim hasil eksekusi command |
| `GET` | `/api/actuator-logs?limit=50` | Ambil log perubahan aktuator |
| `GET` | `/api/notifications` | Ambil notifikasi real |
| `POST` | `/api/notifications/clear` | Bersihkan riwayat notifikasi |
| `POST` | `/api/chat` | Kirim pesan ke AgriBot |

## Contoh Request Sensor

PowerShell:

```powershell
curl.exe -X POST http://localhost:5000/api/sensor-readings `
  -H "Content-Type: application/json" `
  -d "{\"temperature\":27.4,\"ph\":6.7,\"ldr_value\":420}"
```

Jika API token aktif:

```powershell
curl.exe -X POST http://localhost:5000/api/sensor-readings `
  -H "Content-Type: application/json" `
  -H "X-API-Token: change-this-local-token" `
  -d "{\"temperature\":27.4,\"ph\":6.7,\"ldr_value\":420}"
```

Contoh kondisi pH rendah:

```powershell
curl.exe -X POST http://localhost:5000/api/sensor-readings `
  -H "Content-Type: application/json" `
  -d "{\"temperature\":26.4,\"ph\":5.6,\"ldr_value\":430}"
```

Validasi data sensor:

- `ph` wajib berada di rentang `0` sampai `14`.
- `temperature` wajib berada di rentang `0` sampai `60` derajat C.
- `ldr_value` tidak boleh negatif.
- `timestamp` boleh dikosongkan agar backend memakai waktu server.
- Jika `timestamp` dikirim, nilainya harus format ISO 8601 valid.

Contoh riwayat 24 jam terakhir:

```powershell
curl.exe "http://localhost:5000/api/sensor-history?limit=1000&hours=24"
```

Contoh kontrol aktuator:

```powershell
curl.exe -X POST http://localhost:5000/api/actuator-control `
  -H "Content-Type: application/json" `
  -d "{\"key\":\"pumpStatus\",\"value\":\"ON\"}"
```

## Integrasi Aktuator Fisik

Kontrol pompa/lampu sekarang memakai command queue. Saat aplikasi mengirim kontrol, backend membuat command dengan status `pending`, `success`, atau `failed`.

Mode HTTP push langsung ke ESP:

```bash
set URBANGROW_ESP_HTTP_CONTROL_URL=http://192.168.1.50/actuator
set URBANGROW_DEFAULT_DEVICE_ID=esp32-main
python API\app.py
```

Payload yang dikirim backend ke ESP:

```json
{
  "command_id": 1,
  "device_id": "esp32-main",
  "key": "pumpStatus",
  "value": "ON",
  "mqtt_topic": "urbangrow/actuator/commands",
  "requested_at": "2026-07-12T06:00:00+00:00"
}
```

Mode polling HTTP dari ESP:

```powershell
curl.exe "http://localhost:5000/api/actuator-commands/next?device_id=esp32-main"
```

Setelah ESP menjalankan command, kirim ack:

```powershell
curl.exe -X POST http://localhost:5000/api/actuator-commands/ack `
  -H "Content-Type: application/json" `
  -d "{\"command_id\":1,\"status\":\"success\",\"message\":\"Pompa menyala\"}"
```

Jika memakai MQTT bridge, publish payload command ke topic:

```text
urbangrow/actuator/commands
```

Topic dapat diubah lewat:

```bash
set URBANGROW_MQTT_COMMAND_TOPIC=urbangrow/actuator/commands
```

## Validasi

Frontend lint:

```bash
npm run lint
```

Backend syntax check:

```bash
python -m py_compile API\app.py
```

Backend test:

```bash
python -m unittest discover -s tests
```

## Troubleshooting

Jika Expo Go di HP tidak bisa konek ke API:

- Pastikan HP dan laptop satu Wi-Fi.
- Jalankan backend dengan `URBANGROW_API_HOST=0.0.0.0`.
- Gunakan IP LAN laptop di `EXPO_PUBLIC_API_BASE_URL`.
- Pastikan firewall mengizinkan port `5000`.
- Restart Expo setelah mengubah `.env`.

Jika Android emulator tidak bisa konek:

- Gunakan `EXPO_PUBLIC_API_PROFILE=androidEmulator`.
- Pastikan backend berjalan di laptop.

Jika AgriBot membalas key belum dikonfigurasi:

- Set `GEMINI_API_KEY` sebelum menjalankan `python API\app.py`.
- Jalankan ulang backend setelah mengubah env.
