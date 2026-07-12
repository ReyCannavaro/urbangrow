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
