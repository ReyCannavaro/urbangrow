import json
import os
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse


APP_HOST = os.getenv("URBANGROW_API_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("URBANGROW_API_PORT", "5000"))
DATABASE_PATH = os.getenv(
    "URBANGROW_DATABASE_PATH",
    os.path.join(os.path.dirname(__file__), "urban_grow.db"),
)
DEFAULT_TEMPERATURE = 25.5


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        normalized_value = value.replace("Z", "+00:00")
        parsed_value = datetime.fromisoformat(normalized_value)
    except ValueError:
        return None

    if parsed_value.tzinfo is None:
        return parsed_value.replace(tzinfo=timezone.utc)

    return parsed_value.astimezone(timezone.utc)


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                temperature REAL NOT NULL,
                ph REAL NOT NULL,
                ldr_value INTEGER NOT NULL,
                ph_status TEXT,
                light_status TEXT,
                timestamp TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS actuator_status (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pumpStatus TEXT NOT NULL CHECK (pumpStatus IN ('ON', 'OFF')),
                lightStatus TEXT NOT NULL CHECK (lightStatus IN ('ON', 'OFF')),
                updated_at TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            INSERT OR IGNORE INTO actuator_status
                (id, pumpStatus, lightStatus, updated_at)
            VALUES
                (1, 'OFF', 'OFF', ?)
            """,
            (utc_now(),),
        )


def to_float(value: Any, field_name: str, required: bool = True) -> float | None:
    if value is None:
        if required:
            raise ValueError(f"{field_name} wajib diisi.")
        return None

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} harus berupa angka.") from exc


def to_int(value: Any, field_name: str, required: bool = True) -> int | None:
    if value is None:
        if required:
            raise ValueError(f"{field_name} wajib diisi.")
        return None

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} harus berupa angka bulat.") from exc


def get_latest_temperature() -> float:
    with get_db() as db:
        row = db.execute(
            "SELECT temperature FROM sensor_readings ORDER BY timestamp DESC, id DESC LIMIT 1"
        ).fetchone()

    if row is None:
        return DEFAULT_TEMPERATURE

    return float(row["temperature"])


def calculate_actuator_status(temperature: float, ph: float, ldr_value: int) -> dict[str, str]:
    pump_status = "ON" if temperature > 28.5 or temperature < 20.0 or ph < 6.0 or ph > 7.5 else "OFF"
    light_status = "ON" if ldr_value < 300 else "OFF"
    return {"pumpStatus": pump_status, "lightStatus": light_status}


def normalize_sensor_payload(data: dict[str, Any]) -> dict[str, Any]:
    ph = to_float(data.get("ph"), "ph")
    ldr_value = to_int(data.get("ldr_value", data.get("ldr")), "ldr_value")
    temperature = to_float(data.get("temperature"), "temperature", required=False)

    if temperature is None:
        temperature = get_latest_temperature()

    return {
        "temperature": round(temperature, 2),
        "ph": round(ph, 2),
        "ldr_value": ldr_value,
        "ph_status": data.get("ph_status"),
        "light_status": data.get("light_status"),
        "timestamp": data.get("timestamp") or utc_now(),
    }


def insert_sensor_reading(reading: dict[str, Any]) -> dict[str, Any]:
    actuator = calculate_actuator_status(
        reading["temperature"],
        reading["ph"],
        reading["ldr_value"],
    )

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO sensor_readings
                (temperature, ph, ldr_value, ph_status, light_status, timestamp)
            VALUES
                (?, ?, ?, ?, ?, ?)
            """,
            (
                reading["temperature"],
                reading["ph"],
                reading["ldr_value"],
                reading["ph_status"],
                reading["light_status"],
                reading["timestamp"],
            ),
        )
        db.execute(
            """
            UPDATE actuator_status
            SET pumpStatus = ?, lightStatus = ?, updated_at = ?
            WHERE id = 1
            """,
            (actuator["pumpStatus"], actuator["lightStatus"], utc_now()),
        )
        reading_id = cursor.lastrowid

    return {**reading, "id": reading_id, "actuator": actuator}


def get_latest_reading() -> dict[str, Any]:
    with get_db() as db:
        row = db.execute(
            """
            SELECT id, temperature, ph, ldr_value, ph_status, light_status, timestamp
            FROM sensor_readings
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            """
        ).fetchone()

    if row is None:
        return {
            "temperature": DEFAULT_TEMPERATURE,
            "ph": 6.8,
            "ldr_value": 450,
            "timestamp": utc_now(),
            "source": "default",
        }

    return {**dict(row), "source": "database"}


def get_sensor_history(limit: int = 20) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    with get_db() as db:
        rows = db.execute(
            """
            SELECT id, temperature, ph, ldr_value, ph_status, light_status, timestamp
            FROM sensor_readings
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_actuator_status() -> dict[str, Any]:
    with get_db() as db:
        row = db.execute(
            "SELECT pumpStatus, lightStatus, updated_at FROM actuator_status WHERE id = 1"
        ).fetchone()

    if row is None:
        return {"pumpStatus": "OFF", "lightStatus": "OFF", "updated_at": utc_now()}

    return dict(row)


def update_actuator_status(data: dict[str, Any]) -> dict[str, Any]:
    key = data.get("key")
    value = data.get("value")

    if key not in {"pumpStatus", "lightStatus"} or value not in {"ON", "OFF"}:
        raise ValueError("Permintaan kontrol aktuator tidak valid.")

    with get_db() as db:
        db.execute(
            f"UPDATE actuator_status SET {key} = ?, updated_at = ? WHERE id = 1",
            (value, utc_now()),
        )
        row = db.execute(
            "SELECT pumpStatus, lightStatus, updated_at FROM actuator_status WHERE id = 1"
        ).fetchone()

    return dict(row)


def notification_time(timestamp: str | None) -> str:
    parsed_time = parse_timestamp(timestamp)
    if parsed_time is None:
        return datetime.now().strftime("%H:%M")

    return parsed_time.astimezone().strftime("%H:%M")


def create_notification(
    notification_id: int,
    title: str,
    message: str,
    notification_type: str,
    icon: str,
    timestamp: str | None,
) -> dict[str, Any]:
    return {
        "id": notification_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "icon": icon,
        "time": notification_time(timestamp),
        "date": "Hari Ini",
    }


def get_notifications() -> list[dict[str, Any]]:
    latest_reading = get_latest_reading()
    actuator_status = get_actuator_status()
    notifications: list[dict[str, Any]] = []
    next_id = 1

    timestamp = latest_reading.get("timestamp")
    parsed_timestamp = parse_timestamp(timestamp)
    data_source = latest_reading.get("source")

    if parsed_timestamp is None or data_source == "default":
        notifications.append(
            create_notification(
                next_id,
                "Belum Ada Data Sensor",
                "API belum menerima data sensor asli. Dashboard masih memakai nilai default.",
                "warning",
                "wifi-off",
                timestamp,
            )
        )
        next_id += 1
    else:
        minutes_since_update = (datetime.now(timezone.utc) - parsed_timestamp).total_seconds() / 60
        if minutes_since_update > 5:
            notifications.append(
                create_notification(
                    next_id,
                    "Sensor Tidak Update",
                    f"Data sensor terakhir diterima sekitar {int(minutes_since_update)} menit lalu.",
                    "critical",
                    "wifi-off",
                    timestamp,
                )
            )
            next_id += 1

    temperature = float(latest_reading.get("temperature", DEFAULT_TEMPERATURE))
    ph = float(latest_reading.get("ph", 6.8))
    ldr_value = int(latest_reading.get("ldr_value", 450))

    if ph < 6.0:
        notifications.append(
            create_notification(
                next_id,
                "PH Kritis Rendah",
                f"Kadar pH air berada di {ph:.2f}. Segera naikkan pH agar ikan dan tanaman tetap aman.",
                "critical",
                "alert-triangle",
                timestamp,
            )
        )
        next_id += 1
    elif ph > 7.5:
        notifications.append(
            create_notification(
                next_id,
                "PH Terlalu Basa",
                f"Kadar pH air berada di {ph:.2f}. Koreksi pH agar nutrisi tetap mudah diserap.",
                "warning",
                "droplet",
                timestamp,
            )
        )
        next_id += 1

    if temperature > 30:
        notifications.append(
            create_notification(
                next_id,
                "Suhu Air Tinggi",
                f"Suhu air mencapai {temperature:.1f} derajat C. Pertimbangkan pendinginan atau sirkulasi tambahan.",
                "warning",
                "thermometer",
                timestamp,
            )
        )
        next_id += 1
    elif temperature < 20:
        notifications.append(
            create_notification(
                next_id,
                "Suhu Air Rendah",
                f"Suhu air turun ke {temperature:.1f} derajat C. Periksa lingkungan kolam dan stabilkan suhu.",
                "warning",
                "thermometer",
                timestamp,
            )
        )
        next_id += 1

    if ldr_value < 300:
        notifications.append(
            create_notification(
                next_id,
                "Cahaya Rendah",
                f"Nilai LDR {ldr_value}. Lampu grow perlu aktif agar tanaman tetap mendapat cahaya.",
                "info",
                "sun",
                timestamp,
            )
        )
        next_id += 1

    if actuator_status.get("pumpStatus") == "ON":
        notifications.append(
            create_notification(
                next_id,
                "Pompa Air Aktif",
                "Pompa sedang ON untuk menjaga sirkulasi dan menstabilkan kualitas air.",
                "info",
                "droplet",
                actuator_status.get("updated_at", timestamp),
            )
        )
        next_id += 1

    if actuator_status.get("lightStatus") == "ON":
        notifications.append(
            create_notification(
                next_id,
                "Lampu Grow Aktif",
                "Lampu grow sedang ON karena intensitas cahaya terdeteksi rendah.",
                "info",
                "sun",
                actuator_status.get("updated_at", timestamp),
            )
        )

    if not notifications:
        notifications.append(
            create_notification(
                next_id,
                "Sistem Stabil",
                "Suhu, pH, cahaya, dan aktuator berada dalam kondisi aman.",
                "info",
                "check-circle",
                timestamp,
            )
        )

    return notifications


class UrbanGrowHandler(BaseHTTPRequestHandler):
    def send_json(self, status_code: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        if path in {"/", "/api/health"}:
            self.send_json(200, {"status": "ok", "service": "urbangrow-api", "timestamp": utc_now()})
            return

        if path == "/api/latest-reading":
            self.send_json(200, get_latest_reading())
            return

        if path in {"/api/sensor-history", "/api/sensor-log"}:
            try:
                limit = int(query.get("limit", ["20"])[0])
            except ValueError:
                limit = 20
            self.send_json(200, get_sensor_history(limit))
            return

        if path == "/api/actuator-status":
            self.send_json(200, get_actuator_status())
            return

        if path == "/api/notifications":
            self.send_json(200, get_notifications())
            return

        self.send_json(404, {"error": "Endpoint tidak ditemukan."})

    def do_POST(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        try:
            payload = self.read_json_body()
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return

        if path in {"/api/sensor-readings", "/api/update-sensor", "/receive_data"}:
            try:
                reading = normalize_sensor_payload(payload)
                saved_reading = insert_sensor_reading(reading)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return

            print("[INFO] Data sensor diterima:", saved_reading)
            self.send_json(201, {"message": "Data sensor berhasil diterima.", "data": saved_reading})
            return

        if path == "/api/actuator-control":
            try:
                status = update_actuator_status(payload)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return

            self.send_json(200, status)
            return

        self.send_json(404, {"error": "Endpoint tidak ditemukan."})

    def read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise ValueError("Body JSON wajib diisi.")

        raw_body = self.rfile.read(content_length).decode("utf-8")
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ValueError("Body harus berupa JSON valid.") from exc

        if not isinstance(payload, dict):
            raise ValueError("Body JSON harus berupa object.")

        return payload

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[HTTP] {self.address_string()} - {format % args}")


def run_server() -> None:
    init_db()
    server = HTTPServer((APP_HOST, APP_PORT), UrbanGrowHandler)
    print(f"UrbanGrow API berjalan di http://{APP_HOST}:{APP_PORT}")
    print(f"Database SQLite: {DATABASE_PATH}")
    server.serve_forever()


init_db()


if __name__ == "__main__":
    run_server()
