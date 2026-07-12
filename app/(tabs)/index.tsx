import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL, ActuatorStatus, apiGet, normalizeActuatorStatus } from '@/constants/api';

const Feather = { 
    name: 'Feather', 
    size: 20, 
    color: '#000', 
    style: {}, 
    render: (name: string, size: number, color: string, style: any) => {
        let icon: string;
        switch (name) {
            case 'thermometer': icon = '🌡️'; break;
            case 'droplet': icon = '💧'; break;
            case 'cloud-drizzle': icon = '💦'; break;
            case 'zap': icon = '⚡'; break;
            default: icon = '⚫';
        }
        return <Text style={{ fontSize: size * 1.5, color: color, ...style }}>{icon}</Text>;
    }
};

const LinearGradient = ({ colors, start, end, style, children }: any) => {
    const direction = start.x === 0 && end.x === 1 ? 'to right' : 'to left';
    
    const gradientStyle = {
        backgroundImage: `linear-gradient(${direction}, ${colors[0]}, ${colors[1]})`,
    };

    return <View style={[style, gradientStyle]}>{children}</View>;
};

interface SensorData {
    temperature: number;
    ph: number;
    ldr_value: number; 
    timestamp: string;
}

let simulatedSensorData: SensorData = { temperature: 25.5, ph: 6.8, ldr_value: 450, timestamp: new Date().toISOString() };
let simulatedActuatorStatus: ActuatorStatus = { pumpStatus: 'OFF', lightStatus: 'OFF' };

const simulateNewData = (currentSensorData: SensorData, currentActuatorStatus: ActuatorStatus): { sensor: SensorData, actuator: ActuatorStatus } => {
    let tempChange = (Math.random() - 0.5) * 0.2;
    let phChange = (Math.random() - 0.5) * 0.05;
    
    let newPumpStatus: 'ON' | 'OFF' = currentActuatorStatus.pumpStatus;
    if (currentSensorData.temperature > 28.5 || currentSensorData.temperature < 20.0 || currentSensorData.ph < 6.0 || currentSensorData.ph > 7.5) {
        newPumpStatus = "ON";
    } else if (currentSensorData.temperature >= 20.0 && currentSensorData.temperature <= 28.0 && currentSensorData.ph >= 6.5 && currentSensorData.ph <= 7.0) {
        newPumpStatus = "OFF";
    }

    let newLightStatus: 'ON' | 'OFF' = currentSensorData.ldr_value < 300 ? 'ON' : 'OFF';

    const newSensorData: SensorData = {
        temperature: parseFloat((currentSensorData.temperature + tempChange).toFixed(2)),
        ph: parseFloat((currentSensorData.ph + phChange).toFixed(2)),
        ldr_value: currentSensorData.ldr_value,
        timestamp: new Date().toISOString(),
    };

    const newActuatorStatus: ActuatorStatus = {
        pumpStatus: newPumpStatus,
        lightStatus: newLightStatus,
    };
    
    simulatedSensorData = newSensorData;
    simulatedActuatorStatus = newActuatorStatus;

    return { sensor: newSensorData, actuator: newActuatorStatus };
};

const normalizeSensorData = (payload: any): SensorData => ({
    temperature: Number(payload.temperature ?? 0),
    ph: Number(payload.ph ?? 0),
    ldr_value: Number(payload.ldr_value ?? payload.ldr ?? 0),
    timestamp: payload.timestamp ?? new Date().toISOString(),
});

interface DataCardProps {
    title: string;
    value: string;
    unit: string;
    iconName: 'thermometer' | 'droplet' | 'cloud-drizzle' | 'zap'; 
    bgColor: string;
    iconColor: string;
    borderColor: string;
}

const DataCard: React.FC<DataCardProps> = ({ title, value, unit, iconName, bgColor, iconColor, borderColor }) => (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor }]}>
        <View style={styles.cardHeader}>
            <Text style={[styles.cardNormalLabel, { borderColor: borderColor, color: borderColor }]}>Ideal Range</Text>
            {Feather.render(iconName, 28, iconColor, styles.cardIcon)}
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
    lastUpdate: string;
}

const WaterConditionCard: React.FC<WaterConditionCardProps> = ({ currentTemp, currentPh, isLoading, lastUpdate }) => {
    
    const { tempStatus, phStatus, conclusion, dynamicBorderColor } = useMemo(() => 
        analyzeWaterCondition(currentTemp, currentPh), 
        [currentTemp, currentPh]
    ); 

    const overallLabel = (dynamicBorderColor === '#10b981') ? 'OPTIMAL' : (dynamicBorderColor === '#ef4444' ? 'KRITIS' : 'WASPADA');


    if (isLoading && currentTemp === 0.0) {
        return (
            <View style={[styles.card, styles.oxygenCard, { borderColor: '#9ca3af', width: '100%' }]}>
                <Text style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>Memuat data sensor...</Text>
            </View>
        );
    }

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const formattedTime = new Date(lastUpdate).toLocaleTimeString('id-ID', timeOptions);
    
    return ( 
        <View style={[styles.card, styles.oxygenCard, { borderColor: dynamicBorderColor, width: '100%' }]}> 
            <View style={styles.oxygenHeader}> 
                <Text 
                    style={[ 
                        styles.cardNormalLabel, 
                        styles.oxygenNormalLabel, 
                        { borderColor: dynamicBorderColor, color: dynamicBorderColor, backgroundColor: '#fff', fontSize: 12 }
                    ]} 
                > 
                    {overallLabel}
                </Text> 
            </View> 
            <View style={styles.oxygenContent}>
                <View style={[styles.oxygenRing, { borderColor: dynamicBorderColor }]}> 
                    {Feather.render('cloud-drizzle', 50, dynamicBorderColor, { paddingLeft: 0, marginLeft: -5 })}
                </View> 
                <View style={styles.oxygenDetails}> 
                    <Text style={styles.oxygenTitle}>Status Air (Update: {formattedTime})</Text> 
                    <Text style={[styles.oxygenValue, { fontSize: 24, lineHeight: 30 }]}>
                        {tempStatus} / {phStatus}
                    </Text> 
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
    const [sensorData, setSensorData] = useState<SensorData>({ temperature: 0.0, ph: 0.0, ldr_value: 0, timestamp: new Date().toISOString() });
    const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({ pumpStatus: 'OFF', lightStatus: 'OFF' });
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const CustomAlert = () => {
        if (!errorMessage) return null;

        return (
            <View style={styles.customAlert}>
                <Text style={styles.customAlertTitle}>Koneksi Gagal 🔴</Text>
                <Text style={styles.customAlertMessage}>{errorMessage}</Text>
                <View style={styles.customAlertButtonContainer}>
                    <Text style={styles.customAlertButtonText} onPress={() => setErrorMessage('')}>
                        OK
                    </Text>
                </View>
            </View>
        );
    };

    const fetchData = useCallback(async () => {
        try {
            const [latestReading, actuatorData] = await Promise.all([
                apiGet<SensorData>('/api/latest-reading'),
                apiGet<ActuatorStatus>('/api/actuator-status'),
            ]);

            const sensor = normalizeSensorData(latestReading);
            const actuator = normalizeActuatorStatus(actuatorData);

            setSensorData(sensor);
            setActuatorStatus(actuator);
            setIsConnected(true);
            setErrorMessage('');

        } catch (error) {
            console.warn("API unavailable, using local simulation:", error);
            const { sensor, actuator } = simulateNewData(simulatedSensorData, simulatedActuatorStatus);

            setSensorData(sensor);
            setActuatorStatus(actuator);
            setIsConnected(false);
            
            if (isLoading) {
                setErrorMessage(`Tidak dapat terhubung ke server API di ${API_BASE_URL}. Aplikasi ini menggunakan SIMULASI DATA LOKAL.`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        fetchData(); 
        
        const intervalId = setInterval(fetchData, 3000); 

        return () => clearInterval(intervalId);
    }, [fetchData]); 

    const currentTemp = sensorData.temperature || 0.0;
    const currentPh = sensorData.ph || 0.0;

    const headerStatus = isConnected ? '🟢 (API)' : '🔴 (Simulasi)';

    return ( 
        <View style={styles.container}> 
            <CustomAlert />

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

                <WaterConditionCard currentTemp={currentTemp} currentPh={currentPh} isLoading={isLoading} lastUpdate={sensorData.timestamp} /> 

                <View style={styles.statusHeader}> 
                    {Feather.render('zap', 20, '#6366f1', {})}
                    <Text style={styles.statusTitle}>Kontrol Aktuator</Text> 
                </View> 

                <View style={styles.statusGrid}> 
                    <StatusButton 
                        label="Pompa Air" 
                        value={actuatorStatus.pumpStatus} 
                        borderColor={actuatorStatus.pumpStatus === 'ON' ? '#ef4444' : '#6b7280'} 
                    /> 
                    <StatusButton 
                        label="Lampu (LED Grow)" 
                        value={actuatorStatus.lightStatus} 
                        borderColor={actuatorStatus.lightStatus === 'ON' ? '#f59e0b' : '#6b7280'} 
                    /> 
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
        backgroundSize: '100% 100%',
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
    
    customAlert: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        margin: 20,
        marginTop: 50,
        padding: 15,
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 10,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    customAlertTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#dc2626',
        marginBottom: 5,
    },
    customAlertMessage: {
        fontSize: 14,
        color: '#b91c1c',
    },
    customAlertButtonContainer: {
        alignSelf: 'flex-end',
        marginTop: 10,
    },
    customAlertButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#dc2626',
        paddingHorizontal: 10,
        paddingVertical: 5,
        cursor: 'pointer',
    }
});
