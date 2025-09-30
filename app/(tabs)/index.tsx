import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

const API_BASE_URL = 'http://10.0.2.2:3000/api'; 

interface SensorData {
    temperature: number;
    ph: number;
    ldr_value: number;
    timestamp: string;
}

const initialData: SensorData = {
    temperature: 0.0,
    ph: 0.0,
    ldr_value: 0,
    timestamp: new Date().toISOString()
};


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
        if (dynamicBorderColor === '#10b981') dynamicBorderColor = '#f59e0b';
    } else if (temp >= 20) {
        tempStatus = 'Hangat';
    } else if (temp >= 15) {
        tempStatus = 'Dingin';
        if (dynamicBorderColor === '#10b981') dynamicBorderColor = '#f59e0b';
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
    } else if (tempStatus !== 'Hangat') {
        conclusion += ` Kondisi Suhu dan pH berada di batas aman.`;
    }
    
    return { tempStatus, phStatus, conclusion, dynamicBorderColor };
};

interface WaterConditionCardProps {
    currentTemp: number;
    currentPh: number;
}

const WaterConditionCard: React.FC<WaterConditionCardProps> = ({ currentTemp, currentPh }) => {
    const { tempStatus, phStatus, conclusion, dynamicBorderColor } = analyzeWaterCondition(currentTemp, currentPh);
    const overallLabel = (tempStatus === 'Hangat' && phStatus === 'Ideal (Netral)') ? 'Optimal' : 'Perlu Cek';

    return (
        <View style={[styles.card, styles.oxygenCard, { borderColor: dynamicBorderColor }]}>
            <View style={styles.oxygenHeader}>
                <Text 
                    style={[
                        styles.cardNormalLabel, 
                        styles.oxygenNormalLabel,
                        { borderColor: dynamicBorderColor, color: dynamicBorderColor, backgroundColor: 'rgba(255, 255, 255, 0.9)' } 
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
    const [sensorData, setSensorData] = useState<SensorData>(initialData); 
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const url = `${API_BASE_URL}/latest-reading`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Server merespons dengan status: ${response.status}`);
            }

            const data: SensorData = await response.json();
            
            const formattedData = {
                ...data,
                temperature: parseFloat(data.temperature.toString()), 
                ph: parseFloat(data.ph.toString()),
                ldr_value: parseInt(data.ldr_value.toString(), 10),
            };

            setSensorData(formattedData);
            setError(null);
        } catch (err: any) {
            console.error("Fetch Data GAGAL:", err);
            setError(`Gagal terkoneksi ke server: ${err.message}. Cek koneksi & URL.`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);

        return () => clearInterval(intervalId);
    }, [fetchData]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Menghubungkan ke API...</Text>
            </View>
        );
    }

    const { temperature, ph, ldr_value } = sensorData;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#3b82f6', '#10b981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}>
                <Text style={styles.headerText}>Sistem Aktif : Urban Farm 1</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {error && (
                    <View style={styles.errorBox}>
                        <Feather name="alert-triangle" size={24} color="#ef4444" />
                        <Text style={styles.errorText}>
                            {error}
                        </Text>
                    </View>
                )}
                
                <View style={styles.dataRow}>
                    <DataCard
                        title="Suhu Air"
                        value={temperature.toFixed(1)} 
                        unit="°C"
                        iconName="thermometer"
                        bgColor="#e0f2fe"
                        iconColor="#3b82f6"
                        borderColor="#3b82f6"
                    />
                    <DataCard
                        title="PH Air"
                        value={ph.toFixed(2)} 
                        unit=""
                        iconName="droplet"
                        bgColor="#dcfce7"
                        iconColor="#10b981"
                        borderColor="#10b981"
                    />
                </View>
                
                <DataCard
                    title="Intensitas Cahaya (LDR)"
                    value={ldr_value.toString()} 
                    unit="lux"
                    iconName="sun"
                    bgColor="#fefce8"
                    iconColor="#f59e0b"
                    borderColor="#f59e0b"
                />

                <WaterConditionCard currentTemp={temperature} currentPh={ph} />

                <View style={styles.statusHeader}>
                    <Feather name="message-square" size={20} color="#6366f1" />
                    <Text style={styles.statusTitle}>Status Ikan & Tanaman</Text>
                </View>

                <View style={styles.statusGrid}>
                    <StatusButton label="Pompa Air" value="OFF" borderColor="#3b82f6" />
                    <StatusButton label="Lampu Tumbuh" value="OFF" borderColor="#10b981" />
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
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6b7280',
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
    
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
    },
    errorText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#ef4444',
        flexShrink: 1,
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
        marginBottom: 10,
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
        flex: 1,
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
