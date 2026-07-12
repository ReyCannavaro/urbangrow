import json
import os
import sqlite3
import urllib.error
import urllib.request
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
NOTIFICATION_DEDUPE_MINUTES = 5
MIN_TEMPERATURE = 0.0
MAX_TEMPERATURE = 60.0
MIN_PH = 0.0
MAX_PH = 14.0
MIN_LDR_VALUE = 0
DEFAULT_DEVICE_ID = os.getenv("URBANGROW_DEFAULT_DEVICE_ID", "esp32-main")
ESP_HTTP_CONTROL_URL = os.getenv("URBANGROW_ESP_HTTP_CONTROL_URL", "").strip()
ESP_HTTP_SYNC_URL = os.getenv("URBANGROW_ESP_HTTP_SYNC_URL", "").strip()
MQTT_COMMAND_TOPIC = os.getenv("URBANGROW_MQTT_COMMAND_TOPIC", "urbangrow/actuator/commands")
MQTT_SYNC_TOPIC = os.getenv("URBANGROW_MQTT_SYNC_TOPIC", "urbangrow/device/sync")
API_TOKEN = os.getenv("URBANGROW_API_TOKEN", "").strip()
MAX_JSON_BODY_BYTES = int(os.getenv("URBANGROW_MAX_JSON_BODY_BYTES", "8192"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("URBANGROW_RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("URBANGROW_RATE_LIMIT_MAX_REQUESTS", "120"))
SYNC_STALE_MINUTES = int(os.getenv("URBANGROW_SYNC_STALE_MINUTES", "5"))
SYNC_COOLDOWN_SECONDS = int(os.getenv("URBANGROW_SYNC_COOLDOWN_SECONDS", "120"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
AGRIBOT_SYSTEM_PROMPT = (
    "Anda adalah AgriBot, asisten ahli Aquaponik, Hidroponik dan Urban Farming. "
    "Peran Anda HANYA TERBATAS pada menjawab pertanyaan seputar Aquaponik, "
    "Hidroponik, Urban Farming, Pertanian Perkotaan, Kualitas Air, Nutrisi "
    "Tanaman/Ikan, dan Pemeliharaan Sistem Pertanian. Selalu balas dalam Bahasa "
    "Indonesia. Jika pertanyaan tidak relevan dengan topik-topik tersebut, tolak "
    "dengan sopan dan ingatkan pengguna bahwa Anda hanya dapat membantu dalam "
    "konteks pertanian. Jawaban harus informatif, ringkas, dan relevan. Pastikan "
    "setiap poin penting atau judul sub-bagian menggunakan format **bold** agar "
    "mudah dibaca. Untuk daftar, gunakan format * atau - di awal baris."
)
RATE_LIMIT_BUCKETS: dict[tuple[str, str], list[float]] = {}
TOKEN_PROTECTED_POST_PATHS = {
    "/api/sensor-readings",
    "/api/update-sensor",
    "/receive_data",
    "/api/actuator-control",
    "/api/actuator-commands/ack",
    "/api/actuator-command-ack",
    "/api/sync-device",
    "/api/device-sync",
    "/api/sync-device/ack",
    "/api/device-sync/ack",
    "/api/notifications/clear",
}


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


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> bool:
        should_suppress = super().__exit__(exc_type, exc_value, traceback)
        self.close()
        return bool(should_suppress)


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, factory=ClosingConnection)
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
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
                icon TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                is_cleared INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS actuator_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                actuator_key TEXT NOT NULL CHECK (actuator_key IN ('pumpStatus', 'lightStatus')),
                target_value TEXT NOT NULL CHECK (target_value IN ('ON', 'OFF')),
                status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
                delivery_method TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                requested_by TEXT NOT NULL,
                requested_at TEXT NOT NULL,
                delivered_at TEXT,
                completed_at TEXT
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS actuator_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command_id INTEGER,
                actuator_key TEXT NOT NULL,
                target_value TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY(command_id) REFERENCES actuator_commands(id)
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS device_sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'success', 'failed', 'skipped')),
                trigger TEXT NOT NULL,
                reason TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                message TEXT,
                requested_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT
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


def validate_range(value: float | int, field_name: str, min_value: float | int, max_value: float | int | None = None) -> None:
    if value < min_value:
        raise ValueError(f"{field_name} tidak boleh kurang dari {min_value}.")

    if max_value is not None and value > max_value:
        raise ValueError(f"{field_name} tidak boleh lebih dari {max_value}.")


def validate_no_unknown_fields(data: dict[str, Any], allowed_fields: set[str]) -> None:
    unknown_fields = sorted(set(data) - allowed_fields)
    if unknown_fields:
        raise ValueError(f"Field tidak dikenal: {', '.join(unknown_fields)}.")


def validate_required_fields(data: dict[str, Any], required_fields: set[str]) -> None:
    missing_fields = sorted(field for field in required_fields if data.get(field) is None)
    if missing_fields:
        raise ValueError(f"Field wajib belum diisi: {', '.join(missing_fields)}.")


def validate_sensor_request_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(
        data,
        {
            "temperature",
            "ph",
            "ldr",
            "ldr_value",
            "ph_status",
            "light_status",
            "timestamp",
        },
    )
    validate_required_fields(data, {"ph"})

    if data.get("ldr") is None and data.get("ldr_value") is None:
        raise ValueError("Field wajib belum diisi: ldr_value.")


def validate_actuator_request_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(data, {"key", "value", "device_id", "requested_by"})
    validate_required_fields(data, {"key", "value"})


def validate_actuator_ack_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(data, {"command_id", "id", "status", "message"})
    if data.get("command_id") is None and data.get("id") is None:
        raise ValueError("Field wajib belum diisi: command_id.")
    validate_required_fields(data, {"status"})


def validate_sync_request_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(data, {"device_id", "trigger", "reason", "force"})


def validate_sync_ack_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(data, {"sync_id", "id", "status", "message"})
    if data.get("sync_id") is None and data.get("id") is None:
        raise ValueError("Field wajib belum diisi: sync_id.")
    validate_required_fields(data, {"status"})


def validate_chat_request_fields(data: dict[str, Any]) -> None:
    validate_no_unknown_fields(data, {"message"})
    validate_required_fields(data, {"message"})


def normalize_sensor_timestamp(value: Any) -> str:
    if value is None or value == "":
        return utc_now()

    if not isinstance(value, str):
        raise ValueError("timestamp harus berupa string ISO 8601.")

    parsed_timestamp = parse_timestamp(value)
    if parsed_timestamp is None:
        raise ValueError("timestamp harus berupa ISO 8601 yang valid.")

    return parsed_timestamp.isoformat()


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

    validate_range(ph, "ph", MIN_PH, MAX_PH)
    validate_range(temperature, "temperature", MIN_TEMPERATURE, MAX_TEMPERATURE)
    validate_range(ldr_value, "ldr_value", MIN_LDR_VALUE)

    return {
        "temperature": round(temperature, 2),
        "ph": round(ph, 2),
        "ldr_value": ldr_value,
        "ph_status": data.get("ph_status"),
        "light_status": data.get("light_status"),
        "timestamp": normalize_sensor_timestamp(data.get("timestamp")),
    }


def insert_sensor_reading(reading: dict[str, Any]) -> dict[str, Any]:
    previous_actuator = get_actuator_status()
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

    persist_sensor_notifications(reading, previous_actuator, actuator)

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


def get_sensor_history(limit: int = 20, hours: int | None = None) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 1000))
    params: list[Any] = []
    where_clause = ""

    if hours is not None:
        hours = max(1, min(hours, 24 * 7))
        cutoff_timestamp = datetime.now(timezone.utc).timestamp() - hours * 3600
        cutoff = datetime.fromtimestamp(cutoff_timestamp, timezone.utc).isoformat()
        where_clause = "WHERE timestamp >= ?"
        params.append(cutoff)

    params.append(limit)

    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT id, temperature, ph, ldr_value, ph_status, light_status, timestamp
            FROM sensor_readings
            {where_clause}
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            params,
        ).fetchall()

    return [dict(row) for row in rows]


def get_sensor_staleness() -> dict[str, Any]:
    latest_reading = get_latest_reading()
    timestamp = latest_reading.get("timestamp")
    parsed_timestamp = parse_timestamp(timestamp)

    if latest_reading.get("source") == "default" or parsed_timestamp is None:
        return {
            "is_stale": True,
            "minutes_since_update": None,
            "latest_timestamp": timestamp,
            "reason": "API belum menerima data sensor asli.",
        }

    minutes_since_update = int((datetime.now(timezone.utc) - parsed_timestamp).total_seconds() / 60)
    is_stale = minutes_since_update > SYNC_STALE_MINUTES

    return {
        "is_stale": is_stale,
        "minutes_since_update": minutes_since_update,
        "latest_timestamp": timestamp,
        "reason": (
            f"Data sensor terakhir diterima {minutes_since_update} menit lalu."
            if is_stale
            else "Data sensor masih update."
        ),
    }


def sync_payload(sync_log: dict[str, Any]) -> dict[str, Any]:
    return {
        "sync_id": sync_log["id"],
        "device_id": sync_log["device_id"],
        "action": "reconnect_sensor",
        "mqtt_topic": MQTT_SYNC_TOPIC,
        "reason": sync_log["reason"],
        "requested_at": sync_log["requested_at"],
    }


def row_to_device_sync(row: sqlite3.Row) -> dict[str, Any]:
    sync_log = dict(row)
    sync_log["payload"] = sync_payload(sync_log)
    return sync_log


def get_device_sync(sync_id: int) -> dict[str, Any] | None:
    with get_db() as db:
        row = db.execute(
            """
            SELECT id, device_id, status, trigger, reason, attempts, message,
                   requested_at, started_at, completed_at
            FROM device_sync_logs
            WHERE id = ?
            """,
            (sync_id,),
        ).fetchone()

    return row_to_device_sync(row) if row is not None else None


def get_latest_device_sync(device_id: str | None = None) -> dict[str, Any] | None:
    params: list[Any] = []
    where_clause = ""

    if device_id:
        where_clause = "WHERE device_id = ?"
        params.append(device_id)

    with get_db() as db:
        row = db.execute(
            f"""
            SELECT id, device_id, status, trigger, reason, attempts, message,
                   requested_at, started_at, completed_at
            FROM device_sync_logs
            {where_clause}
            ORDER BY requested_at DESC, id DESC
            LIMIT 1
            """,
            params,
        ).fetchone()

    return row_to_device_sync(row) if row is not None else None


def get_sync_status(device_id: str | None = None) -> dict[str, Any]:
    staleness = get_sensor_staleness()
    latest_sync = get_latest_device_sync(device_id)
    status = "idle"

    if latest_sync and latest_sync["status"] in {"pending", "syncing"}:
        status = latest_sync["status"]
    elif staleness["is_stale"]:
        status = "stale"
    elif latest_sync:
        status = latest_sync["status"]

    return {
        "device_id": device_id or DEFAULT_DEVICE_ID,
        "status": status,
        "is_stale": staleness["is_stale"],
        "minutes_since_update": staleness["minutes_since_update"],
        "latest_sensor_timestamp": staleness["latest_timestamp"],
        "reason": staleness["reason"],
        "latest_sync": latest_sync,
    }


def create_device_sync_request(data: dict[str, Any]) -> dict[str, Any]:
    device_id = str(data.get("device_id") or DEFAULT_DEVICE_ID).strip() or DEFAULT_DEVICE_ID
    trigger = str(data.get("trigger") or "manual").strip() or "manual"
    reason = str(data.get("reason") or "Meminta perangkat menyambungkan ulang sensor.").strip()
    force = bool(data.get("force", False))

    latest_sync = get_latest_device_sync(device_id)
    if latest_sync and not force:
        requested_at = parse_timestamp(latest_sync.get("requested_at"))
        is_recent = requested_at is not None and (
            datetime.now(timezone.utc) - requested_at
        ).total_seconds() < SYNC_COOLDOWN_SECONDS
        if latest_sync["status"] in {"pending", "syncing"} or is_recent:
            return {**latest_sync, "message": latest_sync.get("message") or "Sync masih dalam cooldown."}

    requested_at = utc_now()
    status = "pending"
    delivery_method = "http" if ESP_HTTP_SYNC_URL else "queue"
    message = f"Sync {delivery_method} dibuat untuk {device_id}."

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO device_sync_logs
                (device_id, status, trigger, reason, message, requested_at)
            VALUES
                (?, ?, ?, ?, ?, ?)
            """,
            (device_id, status, trigger, reason, message, requested_at),
        )

    sync_log = get_device_sync(int(cursor.lastrowid))
    if sync_log is None:
        raise RuntimeError("Sync device gagal dibuat.")

    insert_notification(
        "Sync Perangkat Dimulai",
        f"Backend meminta {device_id} menyambungkan ulang sensor.",
        "info",
        "refresh-cw",
        requested_at,
        dedupe_minutes=1,
    )

    if ESP_HTTP_SYNC_URL:
        return dispatch_device_sync(sync_log)

    return sync_log


def dispatch_device_sync(sync_log: dict[str, Any]) -> dict[str, Any]:
    payload = sync_payload(sync_log)
    request_body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ESP_HTTP_SYNC_URL,
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with get_db() as db:
        db.execute(
            """
            UPDATE device_sync_logs
            SET status = 'syncing', attempts = attempts + 1, started_at = ?
            WHERE id = ?
            """,
            (utc_now(), sync_log["id"]),
        )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            response_text = response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        return update_device_sync_status(sync_log["id"], "failed", f"Gagal mengirim HTTP sync ke ESP: {exc}")

    response_status = "success"
    response_message = "ESP menerima sync request melalui HTTP."

    if response_text.strip():
        try:
            response_payload = json.loads(response_text)
            response_status = str(response_payload.get("status", response_status)).lower()
            response_message = str(response_payload.get("message", response_message))
        except json.JSONDecodeError:
            response_message = response_text.strip()

    if response_status not in {"success", "failed"}:
        response_status = "success"

    return update_device_sync_status(sync_log["id"], response_status, response_message)


def claim_next_device_sync(device_id: str) -> dict[str, Any] | None:
    device_id = device_id.strip() or DEFAULT_DEVICE_ID
    started_at = utc_now()

    with get_db() as db:
        row = db.execute(
            """
            SELECT id
            FROM device_sync_logs
            WHERE status = 'pending' AND device_id = ?
            ORDER BY requested_at ASC, id ASC
            LIMIT 1
            """,
            (device_id,),
        ).fetchone()

        if row is None:
            return None

        db.execute(
            """
            UPDATE device_sync_logs
            SET status = 'syncing', attempts = attempts + 1, started_at = ?
            WHERE id = ?
            """,
            (started_at, row["id"]),
        )

    return get_device_sync(int(row["id"]))


def update_device_sync_status(sync_id: int, status: str, message: str = "") -> dict[str, Any]:
    if status not in {"success", "failed", "skipped"}:
        raise ValueError("Status sync harus success, failed, atau skipped.")

    completed_at = utc_now()
    with get_db() as db:
        db.execute(
            """
            UPDATE device_sync_logs
            SET status = ?, message = ?, completed_at = ?
            WHERE id = ?
            """,
            (status, message or None, completed_at, sync_id),
        )

    sync_log = get_device_sync(sync_id)
    if sync_log is None:
        raise ValueError("Sync device tidak ditemukan.")

    if status == "success":
        insert_notification(
            "Sync Perangkat Berhasil",
            f"{sync_log['device_id']} berhasil menjalankan sync sensor.",
            "info",
            "check-circle",
            completed_at,
            dedupe_minutes=1,
        )
    elif status == "failed":
        insert_notification(
            "Sync Perangkat Gagal",
            message or f"{sync_log['device_id']} gagal menjalankan sync sensor.",
            "warning",
            "wifi-off",
            completed_at,
            dedupe_minutes=1,
        )

    return sync_log


def get_actuator_status() -> dict[str, Any]:
    with get_db() as db:
        row = db.execute(
            "SELECT pumpStatus, lightStatus, updated_at FROM actuator_status WHERE id = 1"
        ).fetchone()

    if row is None:
        return {"pumpStatus": "OFF", "lightStatus": "OFF", "updated_at": utc_now()}

    return dict(row)


def actuator_label(key: str) -> str:
    return "Pompa Air" if key == "pumpStatus" else "Lampu Grow"


def actuator_icon(key: str) -> str:
    return "droplet" if key == "pumpStatus" else "sun"


def validate_actuator_control_payload(data: dict[str, Any]) -> tuple[str, str, str, str]:
    key = data.get("key")
    value = data.get("value")

    if key not in {"pumpStatus", "lightStatus"} or value not in {"ON", "OFF"}:
        raise ValueError("Permintaan kontrol aktuator tidak valid.")

    device_id = str(data.get("device_id") or DEFAULT_DEVICE_ID).strip() or DEFAULT_DEVICE_ID
    requested_by = str(data.get("requested_by") or "mobile-app").strip() or "mobile-app"

    return key, value, device_id, requested_by


def command_payload(command: dict[str, Any]) -> dict[str, Any]:
    return {
        "command_id": command["id"],
        "device_id": command["device_id"],
        "key": command["actuator_key"],
        "value": command["target_value"],
        "mqtt_topic": MQTT_COMMAND_TOPIC,
        "requested_at": command["requested_at"],
    }


def log_actuator_event(
    command_id: int | None,
    key: str,
    value: str,
    status: str,
    message: str,
) -> None:
    with get_db() as db:
        db.execute(
            """
            INSERT INTO actuator_logs
                (command_id, actuator_key, target_value, status, message, timestamp)
            VALUES
                (?, ?, ?, ?, ?, ?)
            """,
            (command_id, key, value, status, message, utc_now()),
        )


def row_to_actuator_command(row: sqlite3.Row) -> dict[str, Any]:
    command = dict(row)
    command["payload"] = command_payload(command)
    return command


def get_actuator_command(command_id: int) -> dict[str, Any] | None:
    with get_db() as db:
        row = db.execute(
            """
            SELECT id, device_id, actuator_key, target_value, status, delivery_method,
                   attempts, error_message, requested_by, requested_at, delivered_at, completed_at
            FROM actuator_commands
            WHERE id = ?
            """,
            (command_id,),
        ).fetchone()

    return row_to_actuator_command(row) if row is not None else None


def list_actuator_commands(limit: int = 20, status: str | None = None) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    params: list[Any] = []
    where_clause = ""

    if status in {"pending", "success", "failed"}:
        where_clause = "WHERE status = ?"
        params.append(status)

    params.append(limit)

    with get_db() as db:
        rows = db.execute(
            f"""
            SELECT id, device_id, actuator_key, target_value, status, delivery_method,
                   attempts, error_message, requested_by, requested_at, delivered_at, completed_at
            FROM actuator_commands
            {where_clause}
            ORDER BY requested_at DESC, id DESC
            LIMIT ?
            """,
            params,
        ).fetchall()

    return [row_to_actuator_command(row) for row in rows]


def list_actuator_logs(limit: int = 50) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    with get_db() as db:
        rows = db.execute(
            """
            SELECT id, command_id, actuator_key, target_value, status, message, timestamp
            FROM actuator_logs
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def create_actuator_command(data: dict[str, Any]) -> dict[str, Any]:
    key, value, device_id, requested_by = validate_actuator_control_payload(data)
    created_at = utc_now()
    delivery_method = "http" if ESP_HTTP_CONTROL_URL else "queue"

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO actuator_commands
                (device_id, actuator_key, target_value, status, delivery_method, requested_by, requested_at)
            VALUES
                (?, ?, ?, 'pending', ?, ?, ?)
            """,
            (device_id, key, value, delivery_method, requested_by, created_at),
        )

    command_id = int(cursor.lastrowid)
    log_actuator_event(
        command_id,
        key,
        value,
        "pending",
        f"{actuator_label(key)} menunggu eksekusi perangkat {device_id}.",
    )

    command = get_actuator_command(command_id)
    if command is None:
        raise RuntimeError("Command aktuator gagal dibuat.")

    if ESP_HTTP_CONTROL_URL:
        return dispatch_actuator_command(command)

    return command


def apply_actuator_success(key: str, value: str) -> dict[str, Any]:
    updated_at = utc_now()
    with get_db() as db:
        db.execute(
            f"UPDATE actuator_status SET {key} = ?, updated_at = ? WHERE id = 1",
            (value, updated_at),
        )
        row = db.execute(
            "SELECT pumpStatus, lightStatus, updated_at FROM actuator_status WHERE id = 1"
        ).fetchone()

    insert_notification(
        f"{actuator_label(key)} Diubah",
        f"{actuator_label(key)} berhasil disetel ke {value} oleh perangkat fisik.",
        "info",
        actuator_icon(key),
        updated_at,
        dedupe_minutes=None,
    )

    return dict(row)


def update_actuator_command_status(
    command_id: int,
    status: str,
    message: str = "",
) -> dict[str, Any]:
    if status not in {"success", "failed"}:
        raise ValueError("Status command harus success atau failed.")

    command = get_actuator_command(command_id)
    if command is None:
        raise ValueError("Command aktuator tidak ditemukan.")

    completed_at = utc_now()
    with get_db() as db:
        db.execute(
            """
            UPDATE actuator_commands
            SET status = ?, error_message = ?, completed_at = ?
            WHERE id = ?
            """,
            (status, message or None, completed_at, command_id),
        )

    if status == "success":
        apply_actuator_success(command["actuator_key"], command["target_value"])

    log_actuator_event(
        command_id,
        command["actuator_key"],
        command["target_value"],
        status,
        message or f"Command aktuator {status}.",
    )

    updated_command = get_actuator_command(command_id)
    if updated_command is None:
        raise ValueError("Command aktuator tidak ditemukan.")

    return updated_command


def dispatch_actuator_command(command: dict[str, Any]) -> dict[str, Any]:
    payload = command_payload(command)
    request_body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ESP_HTTP_CONTROL_URL,
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            response_text = response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        return mark_dispatched_command_failed(command, f"Gagal mengirim HTTP ke ESP: {exc}")

    response_status = "success"
    response_message = "ESP menerima dan menjalankan command melalui HTTP."

    if response_text.strip():
        try:
            response_payload = json.loads(response_text)
            response_status = str(response_payload.get("status", response_status)).lower()
            response_message = str(response_payload.get("message", response_message))
        except json.JSONDecodeError:
            response_message = response_text.strip()

    if response_status not in {"success", "failed"}:
        response_status = "success"

    return mark_dispatched_command_complete(command, response_status, response_message)


def mark_dispatched_command_complete(
    command: dict[str, Any],
    status: str,
    message: str,
) -> dict[str, Any]:
    delivered_at = utc_now()
    with get_db() as db:
        db.execute(
            """
            UPDATE actuator_commands
            SET attempts = attempts + 1, delivered_at = ?
            WHERE id = ?
            """,
            (delivered_at, command["id"]),
        )

    return update_actuator_command_status(command["id"], status, message)


def mark_dispatched_command_failed(command: dict[str, Any], message: str) -> dict[str, Any]:
    delivered_at = utc_now()
    with get_db() as db:
        db.execute(
            """
            UPDATE actuator_commands
            SET attempts = attempts + 1, delivered_at = ?, error_message = ?
            WHERE id = ?
            """,
            (delivered_at, message, command["id"]),
        )

    return update_actuator_command_status(command["id"], "failed", message)


def claim_next_actuator_command(device_id: str) -> dict[str, Any] | None:
    device_id = device_id.strip() or DEFAULT_DEVICE_ID
    with get_db() as db:
        row = db.execute(
            """
            SELECT id, device_id, actuator_key, target_value, status, delivery_method,
                   attempts, error_message, requested_by, requested_at, delivered_at, completed_at
            FROM actuator_commands
            WHERE status = 'pending' AND device_id = ?
            ORDER BY requested_at ASC, id ASC
            LIMIT 1
            """,
            (device_id,),
        ).fetchone()

        if row is None:
            return None

        db.execute(
            """
            UPDATE actuator_commands
            SET attempts = attempts + 1, delivered_at = ?
            WHERE id = ?
            """,
            (utc_now(), row["id"]),
        )

    command = get_actuator_command(int(row["id"]))
    return command


def notification_time(timestamp: str | None) -> str:
    parsed_time = parse_timestamp(timestamp)
    if parsed_time is None:
        return datetime.now().strftime("%H:%M")

    return parsed_time.astimezone().strftime("%H:%M")


def notification_date(timestamp: str | None) -> str:
    parsed_time = parse_timestamp(timestamp)
    if parsed_time is None:
        return "Hari Ini"

    local_date = parsed_time.astimezone().date()
    today = datetime.now().astimezone().date()
    days_ago = (today - local_date).days

    if days_ago == 0:
        return "Hari Ini"
    if days_ago == 1:
        return "Kemarin"

    return local_date.strftime("%d/%m/%Y")


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
        "date": notification_date(timestamp),
    }


def insert_notification(
    title: str,
    message: str,
    notification_type: str,
    icon: str,
    timestamp: str | None = None,
    dedupe_minutes: int | None = NOTIFICATION_DEDUPE_MINUTES,
) -> int | None:
    created_at = timestamp or utc_now()

    with get_db() as db:
        if dedupe_minutes is not None:
            latest_row = db.execute(
                """
                SELECT timestamp
                FROM notifications
                WHERE title = ? AND is_cleared = 0
                ORDER BY timestamp DESC, id DESC
                LIMIT 1
                """,
                (title,),
            ).fetchone()

            if latest_row is not None:
                latest_time = parse_timestamp(latest_row["timestamp"])
                current_time = parse_timestamp(created_at)
                if latest_time is not None and current_time is not None:
                    minutes_since_latest = (current_time - latest_time).total_seconds() / 60
                    if minutes_since_latest < dedupe_minutes:
                        return None

        cursor = db.execute(
            """
            INSERT INTO notifications
                (title, message, type, icon, timestamp)
            VALUES
                (?, ?, ?, ?, ?)
            """,
            (title, message, notification_type, icon, created_at),
        )

    return cursor.lastrowid


def persist_sensor_notifications(
    reading: dict[str, Any],
    previous_actuator: dict[str, Any],
    actuator: dict[str, str],
) -> None:
    timestamp = reading.get("timestamp")
    temperature = float(reading["temperature"])
    ph = float(reading["ph"])
    ldr_value = int(reading["ldr_value"])

    if ph < 6.0:
        insert_notification(
            "PH Kritis Rendah",
            f"Kadar pH air berada di {ph:.2f}. Segera naikkan pH agar ikan dan tanaman tetap aman.",
            "critical",
            "alert-triangle",
            timestamp,
        )
    elif ph > 7.5:
        insert_notification(
            "PH Terlalu Basa",
            f"Kadar pH air berada di {ph:.2f}. Koreksi pH agar nutrisi tetap mudah diserap.",
            "warning",
            "droplet",
            timestamp,
        )

    if temperature > 30:
        insert_notification(
            "Suhu Air Tinggi",
            f"Suhu air mencapai {temperature:.1f} derajat C. Pertimbangkan pendinginan atau sirkulasi tambahan.",
            "warning",
            "thermometer",
            timestamp,
        )
    elif temperature < 20:
        insert_notification(
            "Suhu Air Rendah",
            f"Suhu air turun ke {temperature:.1f} derajat C. Periksa lingkungan kolam dan stabilkan suhu.",
            "warning",
            "thermometer",
            timestamp,
        )

    if ldr_value < 300:
        insert_notification(
            "Cahaya Rendah",
            f"Nilai LDR {ldr_value}. Lampu grow perlu aktif agar tanaman tetap mendapat cahaya.",
            "info",
            "sun",
            timestamp,
        )

    if previous_actuator.get("pumpStatus") != actuator["pumpStatus"] and actuator["pumpStatus"] == "ON":
        insert_notification(
            "Pompa Air Aktif",
            "Pompa otomatis ON untuk menjaga sirkulasi dan menstabilkan kualitas air.",
            "info",
            "droplet",
            timestamp,
            dedupe_minutes=None,
        )

    if previous_actuator.get("lightStatus") != actuator["lightStatus"] and actuator["lightStatus"] == "ON":
        insert_notification(
            "Lampu Grow Aktif",
            "Lampu grow otomatis ON karena intensitas cahaya terdeteksi rendah.",
            "info",
            "sun",
            timestamp,
            dedupe_minutes=None,
        )


def get_persisted_notifications(limit: int = 50) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    with get_db() as db:
        rows = db.execute(
            """
            SELECT id, title, message, type, icon, timestamp, is_read
            FROM notifications
            WHERE is_cleared = 0
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [
        {
            **create_notification(
                int(row["id"]),
                row["title"],
                row["message"],
                row["type"],
                row["icon"],
                row["timestamp"],
            ),
            "is_read": bool(row["is_read"]),
        }
        for row in rows
    ]


def clear_notifications() -> int:
    with get_db() as db:
        cursor = db.execute(
            """
            UPDATE notifications
            SET is_cleared = 1
            WHERE is_cleared = 0
            """
        )

    return cursor.rowcount


def build_live_notifications() -> list[dict[str, Any]]:
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


def get_notifications(limit: int = 50) -> list[dict[str, Any]]:
    persisted_notifications = get_persisted_notifications(limit)
    if persisted_notifications:
        return persisted_notifications

    return build_live_notifications()


def is_rate_limited(client_id: str, path: str) -> bool:
    if RATE_LIMIT_MAX_REQUESTS <= 0 or RATE_LIMIT_WINDOW_SECONDS <= 0:
        return False

    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    bucket_key = (client_id, path)
    request_times = [timestamp for timestamp in RATE_LIMIT_BUCKETS.get(bucket_key, []) if timestamp >= cutoff]

    if len(request_times) >= RATE_LIMIT_MAX_REQUESTS:
        RATE_LIMIT_BUCKETS[bucket_key] = request_times
        return True

    request_times.append(now)
    RATE_LIMIT_BUCKETS[bucket_key] = request_times
    return False


def get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")


def extract_gemini_text(response_payload: dict[str, Any]) -> str:
    candidates = response_payload.get("candidates", [])
    if not candidates:
        return "Maaf, AgriBot tidak dapat menghasilkan balasan yang relevan."

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [part.get("text", "") for part in parts if part.get("text")]
    text = "\n".join(text_parts).strip()

    return text or "Maaf, AgriBot tidak dapat menghasilkan balasan yang relevan."


def generate_chat_reply(message: str) -> str:
    gemini_api_key = get_gemini_api_key()
    if not gemini_api_key:
        return (
            "Gemini API key belum dikonfigurasi di backend. "
            "Set environment variable GEMINI_API_KEY atau GOOGLE_GENERATIVE_AI_API_KEY, "
            "lalu jalankan ulang API UrbanGrow."
        )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": message}]}],
        "systemInstruction": {"parts": [{"text": AGRIBOT_SYSTEM_PROMPT}]},
    }
    request_body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        GEMINI_API_URL,
        data=request_body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": gemini_api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"[ERROR] Gemini API HTTP {exc.code}: {error_body}")
        return "AgriBot belum dapat menghubungi Gemini. Periksa API key, model, atau kuota layanan."
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"[ERROR] Gemini API network error: {exc}")
        return "AgriBot saat ini tidak dapat terhubung ke layanan Gemini. Periksa koneksi internet backend."
    except json.JSONDecodeError as exc:
        print(f"[ERROR] Gemini API invalid JSON response: {exc}")
        return "AgriBot menerima respons tidak valid dari Gemini."

    return extract_gemini_text(response_payload)


class UrbanGrowHandler(BaseHTTPRequestHandler):
    def send_json(self, status_code: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        if self.is_current_request_rate_limited(path):
            return

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
            try:
                hours = int(query["hours"][0]) if "hours" in query else None
            except ValueError:
                hours = None
            self.send_json(200, get_sensor_history(limit, hours))
            return

        if path == "/api/actuator-status":
            self.send_json(200, get_actuator_status())
            return

        if path == "/api/actuator-commands":
            try:
                limit = int(query.get("limit", ["20"])[0])
            except ValueError:
                limit = 20
            status = query.get("status", [None])[0]
            self.send_json(200, list_actuator_commands(limit, status))
            return

        if path == "/api/actuator-commands/next":
            device_id = query.get("device_id", [DEFAULT_DEVICE_ID])[0]
            command = claim_next_actuator_command(device_id)
            self.send_json(200, {"command": command})
            return

        if path in {"/api/actuator-logs", "/api/actuator-command-log"}:
            try:
                limit = int(query.get("limit", ["50"])[0])
            except ValueError:
                limit = 50
            self.send_json(200, list_actuator_logs(limit))
            return

        if path in {"/api/sync-status", "/api/device-sync/status"}:
            device_id = query.get("device_id", [DEFAULT_DEVICE_ID])[0]
            self.send_json(200, get_sync_status(device_id))
            return

        if path in {"/api/sync-device/next", "/api/device-sync/next"}:
            device_id = query.get("device_id", [DEFAULT_DEVICE_ID])[0]
            sync_log = claim_next_device_sync(device_id)
            self.send_json(200, {"sync": sync_log})
            return

        if path == "/api/notifications":
            try:
                limit = int(query.get("limit", ["50"])[0])
            except ValueError:
                limit = 50
            self.send_json(200, get_notifications(limit))
            return

        self.send_json(404, {"error": "Endpoint tidak ditemukan."})

    def do_POST(self) -> None:
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if self.is_current_request_rate_limited(path):
            return

        if self.requires_api_token(path) and not self.has_valid_api_token():
            self.send_json(401, {"error": "API token tidak valid atau belum dikirim."})
            return

        try:
            payload = self.read_json_body()
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return

        if path in {"/api/sensor-readings", "/api/update-sensor", "/receive_data"}:
            try:
                validate_sensor_request_fields(payload)
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
                validate_actuator_request_fields(payload)
                command = create_actuator_command(payload)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return
            except RuntimeError as exc:
                self.send_json(500, {"error": str(exc)})
                return

            self.send_json(
                202 if command["status"] == "pending" else 200,
                {
                    "message": "Command aktuator dibuat.",
                    "command": command,
                    "actuator": get_actuator_status(),
                },
            )
            return

        if path in {"/api/actuator-commands/ack", "/api/actuator-command-ack"}:
            try:
                validate_actuator_ack_fields(payload)
                command_id = int(payload.get("command_id", payload.get("id")))
                status = str(payload.get("status", "")).lower()
                message = str(payload.get("message", "")).strip()
                command = update_actuator_command_status(command_id, status, message)
            except (TypeError, ValueError) as exc:
                self.send_json(400, {"error": str(exc)})
                return

            self.send_json(
                200,
                {
                    "message": "Ack command aktuator diterima.",
                    "command": command,
                    "actuator": get_actuator_status(),
                },
            )
            return

        if path in {"/api/sync-device", "/api/device-sync"}:
            try:
                validate_sync_request_fields(payload)
                sync_log = create_device_sync_request(payload)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return
            except RuntimeError as exc:
                self.send_json(500, {"error": str(exc)})
                return

            self.send_json(
                202 if sync_log["status"] in {"pending", "syncing"} else 200,
                {
                    "message": "Sync perangkat dibuat.",
                    "sync": sync_log,
                    "sync_status": get_sync_status(sync_log["device_id"]),
                },
            )
            return

        if path in {"/api/sync-device/ack", "/api/device-sync/ack"}:
            try:
                validate_sync_ack_fields(payload)
                sync_id = int(payload.get("sync_id", payload.get("id")))
                status = str(payload.get("status", "")).lower()
                message = str(payload.get("message", "")).strip()
                sync_log = update_device_sync_status(sync_id, status, message)
            except (TypeError, ValueError) as exc:
                self.send_json(400, {"error": str(exc)})
                return

            self.send_json(
                200,
                {
                    "message": "Ack sync perangkat diterima.",
                    "sync": sync_log,
                    "sync_status": get_sync_status(sync_log["device_id"]),
                },
            )
            return

        if path == "/api/notifications/clear":
            try:
                validate_no_unknown_fields(payload, set())
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return

            cleared_count = clear_notifications()
            self.send_json(
                200,
                {
                    "message": "Notifikasi berhasil dibersihkan.",
                    "cleared": cleared_count,
                },
            )
            return

        if path == "/api/chat":
            try:
                validate_chat_request_fields(payload)
            except ValueError as exc:
                self.send_json(400, {"error": str(exc)})
                return

            message = str(payload.get("message", "")).strip()
            if not message:
                self.send_json(400, {"error": "message wajib diisi."})
                return

            self.send_json(200, {"reply": generate_chat_reply(message)})
            return

        self.send_json(404, {"error": "Endpoint tidak ditemukan."})

    def read_json_body(self) -> dict[str, Any]:
        content_type = self.headers.get("Content-Type", "")
        if "application/json" not in content_type.lower():
            raise ValueError("Content-Type harus application/json.")

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise ValueError("Body JSON wajib diisi.")

        if content_length > MAX_JSON_BODY_BYTES:
            raise ValueError(f"Body JSON maksimal {MAX_JSON_BODY_BYTES} bytes.")

        raw_body = self.rfile.read(content_length).decode("utf-8")
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ValueError("Body harus berupa JSON valid.") from exc

        if not isinstance(payload, dict):
            raise ValueError("Body JSON harus berupa object.")

        return payload

    def is_current_request_rate_limited(self, path: str) -> bool:
        client_id = self.client_address[0] if self.client_address else "unknown"
        if is_rate_limited(client_id, path):
            self.send_json(429, {"error": "Terlalu banyak request. Coba lagi nanti."})
            return True

        return False

    def requires_api_token(self, path: str) -> bool:
        return bool(API_TOKEN) and path in TOKEN_PROTECTED_POST_PATHS

    def has_valid_api_token(self) -> bool:
        return self.headers.get("X-API-Token", "") == API_TOKEN

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
