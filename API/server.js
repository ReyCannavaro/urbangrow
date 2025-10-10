const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Cosmos2207',
    database: 'UrbanGrow'
};

let db;

function connectDatabase() {
    db = mysql.createConnection(dbConfig);

    db.connect(err => {
        if (err) {
            console.error('Koneksi database GAGAL:', err.stack);
            setTimeout(connectDatabase, 5000); 
            return;
        }
        console.log('Koneksi database MySQL BERHASIL dengan ID ' + db.threadId);
        
        initializeTables();
    });

    db.on('error', function(err) {
        console.error('MySQL error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') { 
            console.log('Koneksi terputus atau gagal autentikasi. Mencoba koneksi ulang...');
            connectDatabase();
        } else {
            throw err;
        }
    });
}

function initializeTables() {
    const createSensorTable = `
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            temperature DECIMAL(4, 1) NOT NULL,
            ph DECIMAL(3, 2) NOT NULL,
            ldr_value INT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    const createActuatorTable = `
        CREATE TABLE IF NOT EXISTS actuator_status (
            id INT PRIMARY KEY,
            pumpStatus ENUM('ON', 'OFF') DEFAULT 'OFF',
            lightStatus ENUM('ON', 'OFF') DEFAULT 'OFF'
        );
    `;

    db.query(createSensorTable, (err) => {
        if (err) throw err;
        console.log("Tabel 'sensor_readings' siap.");
    });
    
    db.query(createActuatorTable, (err) => {
        if (err) throw err;
        console.log("Tabel 'actuator_status' siap.");
        
        db.query('INSERT IGNORE INTO actuator_status (id, pumpStatus, lightStatus) VALUES (1, "OFF", "OFF")', (err) => {
            if (err) throw err;
            console.log("Status aktuator awal dijamin ada (ID: 1).");
        });
    });
}

connectDatabase(); 

app.use(cors());
app.use(express.json());

app.get('/api/latest-reading', (req, res) => {
    const sql = 'SELECT temperature, ph, ldr_value, timestamp FROM sensor_readings ORDER BY timestamp DESC LIMIT 1';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error saat mengambil data terbaru:', err);
            return res.status(500).json({ message: 'Gagal mengambil data terbaru dari database.' });
        }
        if (result.length === 0) {
            return res.json({ temperature: 0.0, ph: 0.0, ldr_value: 0, timestamp: new Date().toISOString() });
        }
        res.json(result[0]);
    });
});

app.get('/api/sensor-log', (req, res) => {
    const sql = 'SELECT temperature, ph, ldr_value, timestamp FROM sensor_readings ORDER BY timestamp DESC LIMIT 5';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error saat mengambil log sensor:', err);
            return res.status(500).json({ message: 'Gagal mengambil log sensor dari database.' });
        }
        res.json(result); 
    });
});

app.post('/api/update-sensor', (req, res) => {
    const { temperature, ph, ldrValue } = req.body;

    if (temperature === undefined || ph === undefined || ldrValue === undefined) {
        return res.status(400).json({ message: 'Data sensor (temperature, ph, ldrValue) tidak lengkap.' });
    }
    
    const sql = 'INSERT INTO sensor_readings (temperature, ph, ldr_value) VALUES (?, ?, ?)';
    db.query(sql, [temperature, ph, ldrValue], (err, result) => {
        if (err) {
            console.error('Error saat menyimpan data sensor:', err);
            return res.status(500).json({ message: 'Gagal menyimpan data sensor ke database.' });
        }
        console.log(`[INFO] Data Sensor Baru Disimpan: Temp=${temperature}, pH=${ph}, LDR=${ldrValue}`);
        res.status(201).json({ 
            message: 'Data sensor berhasil disimpan', 
            id: result.insertId 
        });
    });
});

app.get('/api/actuator-status', (req, res) => {
    const sql = 'SELECT pumpStatus, lightStatus FROM actuator_status WHERE id = 1'; 
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error saat mengambil status aktuator:', err);
            return res.status(500).json({ message: 'Gagal mengambil status aktuator.' });
        }
        
        if (result.length === 0) {
            return res.json({ pumpStatus: 'OFF', lightStatus: 'OFF' });
        }
        res.json(result[0]);
    });
});

app.post('/api/actuator-control', (req, res) => {
    const { key, value } = req.body;

    if (!key || (key !== 'pumpStatus' && key !== 'lightStatus') || (value !== 'ON' && value !== 'OFF')) {
        return res.status(400).json({ message: 'Permintaan kontrol tidak valid.' });
    }

    const sql = `UPDATE actuator_status SET ${key} = ? WHERE id = 1`;
    db.query(sql, [value], (err) => {
        if (err) {
            console.error('Error saat memperbarui status aktuator:', err);
            return res.status(500).json({ message: 'Gagal memperbarui status aktuator.' });
        }

        console.log(`[INFO] Status Aktuator Diperbarui: ${key} = ${value}`);
        
        db.query('SELECT pumpStatus, lightStatus FROM actuator_status WHERE id = 1', (err, result) => {
            if (err || result.length === 0) {
                 return res.json({ pumpStatus: 'OFF', lightStatus: 'OFF' });
            }
            res.json(result[0]);
        });
    });
});

app.listen(PORT, () => {
    console.log(`\n========================================================================`);
    console.log(`Server API Aquaponics BERJALAN di: http://localhost:${PORT}`);
    console.log(`========================================================================`);
    console.log(`PASTIKAN Anda sudah menginstal: npm install express mysql cors`);
    console.log(`Pastikan kredensial database di 'dbConfig' sudah benar.`);
    console.log(`Untuk menguji di Android Emulator, gunakan URL: http://10.0.2.2:${PORT}/api/latest-reading`);
    console.log(`========================================================================\n`);
});
