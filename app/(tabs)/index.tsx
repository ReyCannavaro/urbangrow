import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native'; // Tambahkan Alert

// *******************************************************************
// *** KONFIGURASI API (UBAH SESUAI IP ANDA) ***
// Ganti dengan IP Address server Anda (misal: 'http://192.168.1.100:3000')
const API_BASE_URL = 'http://10.0.2.2:3000'; // <--- PASTIKAN INI BENAR!
// *******************************************************************

// --- DEFINISI TIPE DATA ---
interface SensorData {
    temperature: number;
    ph: number;
    ldr_value: number; // Tetap ada di tipe data karena dikirim dari server
    timestamp: string;
}

interface ActuatorStatus {
    pumpStatus: 'ON' | 'OFF';
    lightStatus: 'ON' | 'OFF';
}
// --- AKHIR DEFINISI TIPE DATA ---

// Hapus fungsi getRandomArbitrary dan generateNewData yang lama

interface DataCardProps {
    title: string;
    value: string;
    unit: string;
    iconName: keyof typeof Feather;
    bgColor: string;
    iconColor: string;
    borderColor: string;
}

const DataCard: React.FC<DataCardProps> = ({ title, value, unit, iconName, bgColor, iconColor, borderColor }) => (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor }]}>
        <View style={styles.cardHeader}>
            <Text style={[styles.cardNormalLabel, { borderColor: borderColor, color: borderColor }]}>Normal</Text>
            <Feather name={iconName} size={28} color={iconColor} style={styles.cardIcon} />
        </View>
        <Text style={[styles.cardTitle, { color: iconColor }]}>{title}</Text>
        <View style={styles.cardValueContainer}>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardUnit}>{unit}</Text>
        </View>
    </View>
);

interface AnalysisResult { 
    tempStatus: string; 
    phStatus: string; 
    conclusion: string; 
    dynamicBorderColor: string; 
} 

const analyzeWaterCondition = (temp: number, ph: number): AnalysisResult => { 
    let tempStatus = ''; 
    let phStatus = ''; 
    let dynamicBorderColor = '#10b981';

    if (temp > 32) { 
        tempStatus = 'Terlalu Panas'; 
        dynamicBorderColor = '#ef4444';
    } else if (temp >= 28) { 
        tempStatus = 'Panas'; 
        dynamicBorderColor = '#f59e0b';
    } else if (temp >= 20) { 
        tempStatus = 'Hangat'; 
        dynamicBorderColor = '#10b981';
    } else if (temp >= 15) { 
        tempStatus = 'Dingin'; 
        dynamicBorderColor = '#f59e0b';
    } else {
        tempStatus = 'Sangat Dingin'; 
        dynamicBorderColor = '#3b82f6';
    } 

    let tempDynamicColor = dynamicBorderColor;

    if (ph >= 6.0 && ph <= 7.5) { 
        phStatus = 'Ideal (Netral)'; 
    } else if (ph < 6.0) { 
        phStatus = 'Asam'; 
        if (tempDynamicColor !== '#ef4444') { dynamicBorderColor = '#f59e0b'; }
    } else {
        phStatus = 'Basa (Alkaline)'; 
        if (tempDynamicColor !== '#ef4444') { dynamicBorderColor = '#f59e0b'; }
    } 

    let conclusion = `Kondisi air saat ini ${tempStatus} (${temp.toFixed(1)}°C) dan pH ${ph.toFixed(2)} (${phStatus}).`; 

    if (tempStatus === 'Hangat' && phStatus === 'Ideal (Netral)') { 
        conclusion = `Kondisi air saat ini sangat OPTIMAL. Pertahankan level ini.`; 
    } else if (tempStatus === 'Sangat Dingin' || tempStatus === 'Terlalu Panas') { 
        conclusion += ` Suhu air TIDAK ideal. Perlu penyesuaian untuk menjaga kesehatan ikan dan tanaman.`; 
        dynamicBorderColor = '#ef4444';
    } else if (phStatus !== 'Ideal (Netral)') { 
        conclusion += ` Kualitas pH air perlu dikoreksi.`; 
    } else { 
        conclusion += ` Kondisi Suhu dan pH berada di batas aman.`; 
    } 

    return { tempStatus, phStatus, conclusion, dynamicBorderColor }; 
};

interface WaterConditionCardProps {
    currentTemp: number;
    currentPh: number;
    isLoading: boolean;
}

const WaterConditionCard: React.FC<WaterConditionCardProps> = ({ currentTemp, currentPh, isLoading }) => {
    // Tampilkan loading jika data masih 0.0 atau sedang fetch
    if (isLoading && currentTemp === 0.0) {
        return (
            <View style={[styles.card, styles.oxygenCard, { borderColor: '#9ca3af', width: '100%' }]}>
                <Text style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Memuat data sensor...</Text>
            </View>
        );
    }

    const { tempStatus, phStatus, conclusion, dynamicBorderColor } = analyzeWaterCondition(currentTemp, currentPh); 
    const overallLabel = (tempStatus === 'Hangat' && phStatus === 'Ideal (Netral)') ? 'Optimal' : 'Perlu Cek';

    return ( 
        <View style={[styles.card, styles.oxygenCard, { borderColor: dynamicBorderColor, width: '100%' }]}> 
            <View style={styles.oxygenHeader}> 
                <Text  
                    style={[ 
                        styles.cardNormalLabel,  
                        styles.oxygenNormalLabel,  
                        { borderColor: dynamicBorderColor, color: dynamicBorderColor, backgroundColor: 'rgba(255, 255, 255, 0.9)' } // Sedikit ubah background agar lebih terlihat 
                    ]} 
                > 
                    {overallLabel} 
                </Text> 
            </View> 
            <View style={styles.oxygenContent}>
                <View style={[styles.oxygenRing, { borderColor: dynamicBorderColor }]}> 
                    <Feather name="cloud-drizzle" size={50} color={dynamicBorderColor} style={{ paddingLeft: 0, marginLeft: -5 }} /> 
                </View> 
                <View style={styles.oxygenDetails}> 
                    <Text style={styles.oxygenTitle}>Kondisi Air</Text> 
                    <Text style={[styles.oxygenValue, { fontSize: 24, lineHeight: 30 }]}>{tempStatus} / {phStatus}</Text> 
                </View> 
            </View> 
            <Text style={{ fontSize: 13, color: '#4b5563', marginTop: 10, lineHeight: 18, paddingHorizontal: 5 }}> 
                {conclusion} 
            </Text> 
        </View> 
    ); 
}; 

interface StatusButtonProps { 
    label: string; 
    value: string; 
    borderColor: string; 
} 

const StatusButton: React.FC<StatusButtonProps> = ({ label, value, borderColor }) => ( 
    <View style={[styles.statusButton, { borderColor: borderColor }]}> 
        <Text style={[styles.statusButtonLabel, { color: borderColor }]}>{label}</Text> 
        <Text style={styles.statusButtonValue}>{value}</Text> 
    </View> 
); 

const HomePage: React.FC = () => {
    // 1. State untuk menyimpan data sensor dan aktuator
    const [sensorData, setSensorData] = useState<SensorData>({ temperature: 0.0, ph: 0.0, ldr_value: 0, timestamp: '' });
    const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({ pumpStatus: 'OFF', lightStatus: 'OFF' });
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // 2. Fungsi untuk mengambil data dari server
    const fetchData = async () => {
        try {
            // Ambil Data Sensor Terbaru
            const sensorResponse = await fetch(`${API_BASE_URL}/api/latest-reading`);
            const sensorJson = await sensorResponse.json();
            
            // Ambil Status Aktuator
            const actuatorResponse = await fetch(`${API_BASE_URL}/api/actuator-status`);
            const actuatorJson = await actuatorResponse.json();
            
            setSensorData(sensorJson);
            setActuatorStatus(actuatorJson);
            setIsConnected(true);

        } catch (error) {
            console.error("Error fetching data:", error);
            setIsConnected(false);
            
            // Tampilkan pesan error hanya sekali saat pertama kali gagal
            if (isLoading) {
                 Alert.alert(
                    "Koneksi Gagal 🔴",
                    `Tidak dapat terhubung ke server API di ${API_BASE_URL}. Pastikan server.js berjalan dan IP sudah benar.`,
                    [{ text: "OK" }]
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 3. useEffect untuk menjalankan fetching secara berkala (setiap 3 detik)
    useEffect(() => {
        fetchData(); // Ambil data segera saat komponen di-mount
        
        const intervalId = setInterval(fetchData, 3000); // Ambil data setiap 3 detik

        // Cleanup function
        return () => clearInterval(intervalId);
    }, []); // Dependency array kosong agar interval hanya dibuat sekali

    // 4. Mapping data sensor
    // Gunakan 0.0 jika data belum terambil (atau null/undefined)
    const currentTemp = sensorData.temperature || 0.0;
    const currentPh = sensorData.ph || 0.0;

    // Perbarui Tampilan Header dengan Status Koneksi
    const headerStatus = isConnected ? '🟢' : '🔴';

    return ( 
        <View style={styles.container}> 
            <LinearGradient 
                colors={['#3b82f6', '#10b981']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.header}> 
                <Text style={styles.headerText}>
                    Sistem Aktif : Urban Farm 1 {headerStatus}
                </Text> 
            </LinearGradient> 

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}> 
                
                <View style={styles.dataRow}> 
                    <DataCard 
                        title="Suhu Air" 
                        value={currentTemp.toFixed(1)} 
                        unit="°C" 
                        iconName="thermometer" 
                        bgColor="#e0f2fe" 
                        iconColor="#3b82f6" 
                        borderColor="#3b82f6" 
                    /> 
                    <DataCard 
                        title="PH Air" 
                        value={currentPh.toFixed(2)} 
                        unit="" 
                        iconName="droplet" 
                        bgColor="#dcfce7" 
                        iconColor="#10b981" 
                        borderColor="#10b981" 
                    /> 
                </View> 

                <WaterConditionCard currentTemp={currentTemp} currentPh={currentPh} isLoading={isLoading} /> 

                {/* Status Aktuator Baru */}
                <View style={styles.statusHeader}> 
                    <Feather name="zap" size={20} color="#6366f1" /> 
                    <Text style={styles.statusTitle}>Kontrol Aktuator</Text> 
                </View> 

                <View style={styles.statusGrid}> 
                    {/* Status Pompa Air */}
                    <StatusButton 
                        label="Pompa Air" 
                        value={actuatorStatus.pumpStatus} 
                        borderColor={actuatorStatus.pumpStatus === 'ON' ? '#ef4444' : '#6b7280'} 
                    /> 
                    {/* Status Lampu */}
                    <StatusButton 
                        label="Lampu (LED Grow)" 
                        value={actuatorStatus.lightStatus} 
                        borderColor={actuatorStatus.lightStatus === 'ON' ? '#f59e0b' : '#6b7280'} 
                    /> 
                    {/* Data ikan dan tanaman tetap statis sesuai desain lama */}
                    <StatusButton label="Lele" value="27 Ekor" borderColor="#3b82f6" /> 
                    <StatusButton label="Nila" value="27 Ekor" borderColor="#3b82f6" /> 
                    <StatusButton label="Pakcoy" value="14 Hari" borderColor="#10b981" /> 
                    <StatusButton label="Kangkung" value="17 Hari" borderColor="#10b981" /> 
                </View> 
                
                <View style={{ height: 100 }} />  
            </ScrollView> 
        </View> 
    ); 
}; 

export default HomePage; 


const styles = StyleSheet.create({ 
    container: { 
        flex: 1, 
        backgroundColor: '#f8f8f8', 
    }, 

    header: { 
        paddingTop: 20, 
        paddingBottom: 20, 
        paddingHorizontal: 20, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 25, 
        marginBottom: 10, 
        marginHorizontal: 15, 
        borderRadius: 20, 
    }, 
    headerText: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#fff', 
    }, 

    scrollContent: { 
        paddingHorizontal: 15, 
        paddingBottom: 10, 
    }, 

    dataRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 10, 
    }, 
    card: { 
        width: '48.5%', 
        borderRadius: 15, 
        padding: 15, 
        borderWidth: 1.5, 
        backgroundColor: '#fff',
    }, 
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 10, 
    }, 
    cardTitle: { 
        fontSize: 14, 
        color: '#374151', 
        fontWeight: '500', 
    }, 
    cardValueContainer: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        marginTop: 5, 
    }, 
    cardValue: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: '#1f2937', 
    }, 
    cardUnit: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#1f2937', 
        marginLeft: 5, 
        marginBottom: 3, 
    }, 
    cardIcon: { 
        alignSelf: 'flex-start', 
    }, 
    cardNormalLabel: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        borderWidth: 1, 
        borderRadius: 10, 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        alignSelf: 'flex-start', 
        backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    }, 

    oxygenCard: { 
        width: '100%', 
        backgroundColor: '#fff', 
        borderColor: '#10b981', 
        marginBottom: 20, 
    }, 
    oxygenHeader: { 
        alignItems: 'flex-end', 
    }, 
    oxygenNormalLabel: { 
        color: '#10b981', 
        borderColor: '#10b981', 
    }, 
    oxygenContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 10, 
    }, 
    oxygenRing: { 
        width: 70, 
        height: 70, 
        borderRadius: 35, 
        borderWidth: 3, 
        borderColor: '#10b981', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 20, 
        paddingLeft: 5, 
    }, 
    oxygenDetails: { 
        flex: 1, 
    }, 
    oxygenTitle: { 
        fontSize: 14, 
        color: '#374151', 
        fontWeight: '500', 
    }, 

    oxygenValue: { 
        fontWeight: 'bold', 
        color: '#1f2937', 
        marginTop: 5,
        fontSize: 24,
        lineHeight: 30,
    }, 

    statusHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 15, 
        paddingTop: 10, 
    }, 
    statusTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#1f2937', 
        marginLeft: 8, 
    }, 
    statusGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        marginBottom: 20, 
    }, 
    statusButton: { 
        width: '48.5%', 
        borderRadius: 15, 
        padding: 20, 
        borderWidth: 1.5, 
        marginBottom: 10, 
        backgroundColor: '#fff', 
    }, 
    statusButtonLabel: { 
        fontSize: 16, 
        fontWeight: 'bold', 
    }, 
    statusButtonValue: { 
        fontSize: 16, 
        color: '#6b7280', 
        marginTop: 5, 
    }, 
});