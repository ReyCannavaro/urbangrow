import os
import tempfile
import unittest


TEST_DATABASE_PATH = os.path.join(tempfile.gettempdir(), "urbangrow_backend_test.db")
os.environ["URBANGROW_DATABASE_PATH"] = TEST_DATABASE_PATH
os.environ.pop("GEMINI_API_KEY", None)
os.environ.pop("GOOGLE_GENERATIVE_AI_API_KEY", None)

from API import app as api  # noqa: E402


class BackendTestCase(unittest.TestCase):
    def setUp(self) -> None:
        api.RATE_LIMIT_BUCKETS.clear()
        if os.path.exists(TEST_DATABASE_PATH):
            os.remove(TEST_DATABASE_PATH)
        api.init_db()

    def tearDown(self) -> None:
        if os.path.exists(TEST_DATABASE_PATH):
            os.remove(TEST_DATABASE_PATH)

    def test_insert_sensor_reading_persists_sensor(self) -> None:
        reading = api.normalize_sensor_payload(
            {
                "temperature": 27.4,
                "ph": 6.7,
                "ldr_value": 420,
                "timestamp": "2026-07-12T06:00:00Z",
            }
        )

        saved_reading = api.insert_sensor_reading(reading)
        history = api.get_sensor_history(limit=10)

        self.assertEqual(saved_reading["id"], 1)
        self.assertEqual(saved_reading["temperature"], 27.4)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["ph"], 6.7)

    def test_latest_reading_returns_newest_sensor(self) -> None:
        first_reading = api.normalize_sensor_payload(
            {
                "temperature": 25.0,
                "ph": 6.8,
                "ldr_value": 450,
                "timestamp": "2026-07-12T06:00:00Z",
            }
        )
        second_reading = api.normalize_sensor_payload(
            {
                "temperature": 29.0,
                "ph": 7.1,
                "ldr_value": 390,
                "timestamp": "2026-07-12T07:00:00Z",
            }
        )

        api.insert_sensor_reading(first_reading)
        api.insert_sensor_reading(second_reading)
        latest_reading = api.get_latest_reading()

        self.assertEqual(latest_reading["source"], "database")
        self.assertEqual(latest_reading["temperature"], 29.0)
        self.assertEqual(latest_reading["timestamp"], "2026-07-12T07:00:00+00:00")

    def test_actuator_status_updates_after_command_ack_success(self) -> None:
        command = api.create_actuator_command({"key": "pumpStatus", "value": "ON"})
        claimed_command = api.claim_next_actuator_command("esp32-main")

        self.assertEqual(command["status"], "pending")
        self.assertIsNotNone(claimed_command)

        api.update_actuator_command_status(command["id"], "success", "Pompa menyala")
        actuator_status = api.get_actuator_status()

        self.assertEqual(actuator_status["pumpStatus"], "ON")

    def test_notifications_are_created_from_sensor_conditions(self) -> None:
        reading = api.normalize_sensor_payload(
            {
                "temperature": 31.2,
                "ph": 5.6,
                "ldr_value": 180,
                "timestamp": "2026-07-12T06:00:00Z",
            }
        )

        api.insert_sensor_reading(reading)
        notifications = api.get_notifications()
        titles = {notification["title"] for notification in notifications}

        self.assertIn("PH Kritis Rendah", titles)
        self.assertIn("Suhu Air Tinggi", titles)
        self.assertIn("Cahaya Rendah", titles)

    def test_chat_fallback_without_api_key(self) -> None:
        os.environ.pop("GEMINI_API_KEY", None)
        os.environ.pop("GOOGLE_GENERATIVE_AI_API_KEY", None)

        reply = api.generate_chat_reply("Bagaimana menjaga pH?")

        self.assertIn("Gemini API key belum dikonfigurasi", reply)

    def test_sensor_validation_rejects_invalid_values(self) -> None:
        with self.assertRaises(ValueError):
            api.normalize_sensor_payload({"temperature": 27, "ph": 15, "ldr_value": 1})

        with self.assertRaises(ValueError):
            api.normalize_sensor_payload({"temperature": 27, "ph": 6.8, "ldr_value": -1})

        with self.assertRaises(ValueError):
            api.normalize_sensor_payload(
                {"temperature": 27, "ph": 6.8, "ldr_value": 1, "timestamp": "not-a-date"}
            )

    def test_device_sync_queue_and_ack_success(self) -> None:
        sync_log = api.create_device_sync_request(
            {
                "trigger": "manual",
                "reason": "Data sensor tidak update.",
                "force": True,
            }
        )
        claimed_sync = api.claim_next_device_sync("esp32-main")

        self.assertEqual(sync_log["status"], "pending")
        self.assertIsNotNone(claimed_sync)
        self.assertEqual(claimed_sync["status"], "syncing")
        self.assertEqual(claimed_sync["payload"]["action"], "reconnect_sensor")

        completed_sync = api.update_device_sync_status(
            claimed_sync["id"],
            "success",
            "Sensor reconnect berhasil.",
        )
        sync_status = api.get_sync_status("esp32-main")

        self.assertEqual(completed_sync["status"], "success")
        self.assertEqual(sync_status["latest_sync"]["status"], "success")


if __name__ == "__main__":
    unittest.main()
