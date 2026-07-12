import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActuatorKey, ActuatorStatus, apiGet, apiPost, normalizeActuatorStatus } from '@/constants/api';

const PRIMARY_GRADIENT = ['#3b82f6', '#10b981'] as const;
const COLOR_BLUE = '#60a5fa';
const COLOR_YELLOW = '#facc15';
const COLOR_ORANGE = '#f97316';

interface ControlItem {
    id: 'pompa' | 'lampu';
    actuatorKey: ActuatorKey;
    title: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
}

const controlItems: ControlItem[] = [
    { id: 'pompa', actuatorKey: 'pumpStatus', title: 'Pompa Air', icon: 'droplet', color: COLOR_BLUE },
    { id: 'lampu', actuatorKey: 'lightStatus', title: 'Lampu LED', icon: 'sun', color: COLOR_YELLOW },
];

interface RecommendationItem {
    id: number;
    text: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
}

interface ManualSensorForm {
    temperature: string;
    ph: string;
    ldrValue: string;
}

interface SensorPreset {
    id: string;
    label: string;
    temperature: number;
    ph: number;
    ldrValue: number;
    color: string;
}

const recommendationData: RecommendationItem[] = [
    { id: 1, text: 'Kondisi optimal untuk pertumbuhan sayur', icon: 'check-circle', color: '#10b981' },
    { id: 2, text: 'Pertimbangkan panen kangkung minggu ini', icon: 'alert-triangle', color: '#facc15' },
    { id: 3, text: 'Berapa Ph air dengan kualitas terbaik', icon: 'droplet', color: '#3b82f6' },
];

const sensorPresets: SensorPreset[] = [
    { id: 'normal', label: 'Normal', temperature: 26.8, ph: 6.8, ldrValue: 460, color: '#10b981' },
    { id: 'ph-low', label: 'pH Rendah', temperature: 26.4, ph: 5.6, ldrValue: 430, color: '#ef4444' },
    { id: 'hot', label: 'Suhu Tinggi', temperature: 31.2, ph: 7.1, ldrValue: 410, color: '#f97316' },
    { id: 'low-light', label: 'Cahaya Rendah', temperature: 25.9, ph: 6.9, ldrValue: 180, color: '#facc15' },
];

interface MainControlCardProps extends ControlItem {
    isDisabled: boolean;
    isOn: boolean;
    onToggle: (item: ControlItem, nextValue: 'ON' | 'OFF') => void;
}

const MainControlCard: React.FC<MainControlCardProps> = ({ title, icon, color, isDisabled, isOn, onToggle, ...item }) => {
    const cardStyle = {
        backgroundColor: isOn ? color + '20' : '#fefefe', 
        borderColor: isOn ? color : '#cbd5e1',
    };

    const iconColor = isOn ? color : '#6b7280';
    const statusBgColor = isOn ? color : '#ef4444';

    return (
        <Pressable 
            style={({ pressed }) => [
                styles.mainControlCard, 
                cardStyle,
                { opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={() => onToggle({ ...item, title, icon, color }, isOn ? 'OFF' : 'ON')}
            disabled={isDisabled}
        >
            <Feather 
                name={icon} 
                size={40} 
                color={iconColor} 
                style={styles.controlIcon} 
            />
            <Text style={styles.controlTitleText}>{title}</Text>
            
            <View style={[styles.controlStatusButton, { backgroundColor: statusBgColor }]}>
                <Text style={styles.controlStatusText}>
                    {isOn ? 'ON' : 'OFF'}
                </Text>
            </View>
        </Pressable>
    );
};

interface ActionCardProps {
    title: string;
    subtitle: string;
    icon: keyof typeof Feather.glyphMap;
    actionColor: string;
    onPerformAction: () => void;
}

const ActionPressable: React.FC<ActionCardProps> = ({ title, subtitle, icon, actionColor, onPerformAction }) => {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: actionColor, 
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                }
            ]}
            onPress={onPerformAction}
        >
            <Feather name={icon} size={30} color="#fff" />
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </Pressable>
    );
};

const RecommendationCard: React.FC<{ item: RecommendationItem }> = ({ item }) => {
    return (
        <Pressable 
            style={({ pressed }) => [styles.recommendationCard, { backgroundColor: pressed ? '#f3f4f6' : '#fff' }]}
            onPress={() => Alert.alert('Rekomendasi', item.text)}
        >
            <View style={[styles.recommendationIconWrapper, { borderColor: item.color }]}>
                <Feather name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.recommendationText}>{item.text}</Text>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
        </Pressable>
    );
};

const ExplorePage: React.FC = () => {
    const insets = useSafeAreaInsets();
    
    const [isFeederActive, setIsFeederActive] = useState(false);
    const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({ pumpStatus: 'OFF', lightStatus: 'OFF' });
    const [isActuatorLoading, setIsActuatorLoading] = useState(true);
    const [activeControl, setActiveControl] = useState<ActuatorKey | null>(null);
    const [controlError, setControlError] = useState('');
    const [manualSensorForm, setManualSensorForm] = useState<ManualSensorForm>({
        temperature: '26.8',
        ph: '6.8',
        ldrValue: '460',
    });
    const [isSensorSubmitting, setIsSensorSubmitting] = useState(false);
    const [sensorSubmitMessage, setSensorSubmitMessage] = useState('');
    const [sensorSubmitError, setSensorSubmitError] = useState('');

    const fetchActuatorStatus = useCallback(async () => {
        try {
            const status = await apiGet<ActuatorStatus>('/api/actuator-status');
            setActuatorStatus(normalizeActuatorStatus(status));
            setControlError('');
        } catch (error) {
            console.warn('Failed to load actuator status:', error);
            setControlError('Tidak terhubung ke API. Kontrol perangkat sementara nonaktif.');
        } finally {
            setIsActuatorLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActuatorStatus();
    }, [fetchActuatorStatus]);

    const handleActuatorToggle = async (item: ControlItem, nextValue: 'ON' | 'OFF') => {
        setActiveControl(item.actuatorKey);
        setControlError('');

        try {
            const updatedStatus = await apiPost<ActuatorStatus>('/api/actuator-control', {
                key: item.actuatorKey,
                value: nextValue,
            });

            setActuatorStatus(normalizeActuatorStatus(updatedStatus));
            Alert.alert(item.title, `${item.title} telah ${nextValue === 'ON' ? 'diaktifkan (ON)' : 'dimatikan (OFF)'}.`);
        } catch (error) {
            console.warn('Failed to update actuator status:', error);
            setControlError('Gagal mengirim perintah ke API. Pastikan backend sedang berjalan.');
            Alert.alert('Kontrol Gagal', 'Perintah belum terkirim ke sistem. Pastikan API UrbanGrow sedang berjalan.');
        } finally {
            setActiveControl(null);
        }
    };

    const handleFeedAction = () => {
        Alert.alert('Aksi Pakan', 'Pakan ikan telah dikeluarkan sekarang.');
    };

    const setSensorField = (field: keyof ManualSensorForm, value: string) => {
        setManualSensorForm(prev => ({ ...prev, [field]: value }));
        setSensorSubmitMessage('');
        setSensorSubmitError('');
    };

    const applySensorPreset = (preset: SensorPreset) => {
        setManualSensorForm({
            temperature: preset.temperature.toString(),
            ph: preset.ph.toString(),
            ldrValue: preset.ldrValue.toString(),
        });
        setSensorSubmitMessage('');
        setSensorSubmitError('');
    };

    const parseNumberField = (value: string) => Number(value.replace(',', '.'));

    const handleManualSensorSubmit = async () => {
        const temperature = parseNumberField(manualSensorForm.temperature);
        const ph = parseNumberField(manualSensorForm.ph);
        const ldrValue = parseNumberField(manualSensorForm.ldrValue);

        if (!Number.isFinite(temperature) || !Number.isFinite(ph) || !Number.isFinite(ldrValue)) {
            setSensorSubmitError('Semua nilai sensor harus berupa angka.');
            return;
        }

        if (ph < 0 || ph > 14) {
            setSensorSubmitError('pH harus berada di rentang 0 sampai 14.');
            return;
        }

        if (ldrValue < 0) {
            setSensorSubmitError('Nilai LDR tidak boleh negatif.');
            return;
        }

        setIsSensorSubmitting(true);
        setSensorSubmitError('');
        setSensorSubmitMessage('');

        try {
            await apiPost('/api/sensor-readings', {
                temperature,
                ph,
                ldr_value: Math.round(ldrValue),
            });
            await fetchActuatorStatus();
            setSensorSubmitMessage('Data sensor berhasil dikirim ke API.');
        } catch (error) {
            console.warn('Failed to submit manual sensor data:', error);
            setSensorSubmitError('Gagal mengirim data sensor. Pastikan backend UrbanGrow sedang berjalan.');
        } finally {
            setIsSensorSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

                <LinearGradient
                    colors={PRIMARY_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}>
                    <Text style={styles.headerTitle}>Kontrol Sistem UrbanFarm</Text>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kontrol Perangkat</Text>
                    {controlError ? <Text style={styles.errorText}>{controlError}</Text> : null}
                    <View style={styles.mainControlsRow}>
                        {controlItems.map(item => (
                            <MainControlCard
                                key={item.id}
                                {...item}
                                isDisabled={isActuatorLoading || activeControl === item.actuatorKey || Boolean(controlError)}
                                isOn={actuatorStatus[item.actuatorKey] === 'ON'}
                                onToggle={handleActuatorToggle}
                            />
                        ))}
                    </View>
                    {isActuatorLoading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingText}>Memuat status perangkat...</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Input Sensor Manual</Text>
                    <View style={styles.manualSensorCard}>
                        <View style={styles.manualInputRow}>
                            <View style={styles.manualInputGroup}>
                                <Text style={styles.manualInputLabel}>Suhu</Text>
                                <TextInput
                                    style={styles.manualInput}
                                    value={manualSensorForm.temperature}
                                    onChangeText={value => setSensorField('temperature', value)}
                                    keyboardType="decimal-pad"
                                    placeholder="26.8"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View style={styles.manualInputGroup}>
                                <Text style={styles.manualInputLabel}>pH</Text>
                                <TextInput
                                    style={styles.manualInput}
                                    value={manualSensorForm.ph}
                                    onChangeText={value => setSensorField('ph', value)}
                                    keyboardType="decimal-pad"
                                    placeholder="6.8"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View style={styles.manualInputGroup}>
                                <Text style={styles.manualInputLabel}>LDR</Text>
                                <TextInput
                                    style={styles.manualInput}
                                    value={manualSensorForm.ldrValue}
                                    onChangeText={value => setSensorField('ldrValue', value)}
                                    keyboardType="number-pad"
                                    placeholder="460"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        <View style={styles.presetGrid}>
                            {sensorPresets.map(preset => (
                                <Pressable
                                    key={preset.id}
                                    style={({ pressed }) => [
                                        styles.presetButton,
                                        { borderColor: preset.color, opacity: pressed ? 0.72 : 1 },
                                    ]}
                                    onPress={() => applySensorPreset(preset)}
                                >
                                    <Text style={[styles.presetButtonText, { color: preset.color }]}>{preset.label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {sensorSubmitError ? <Text style={styles.errorText}>{sensorSubmitError}</Text> : null}
                        {sensorSubmitMessage ? <Text style={styles.successText}>{sensorSubmitMessage}</Text> : null}

                        <Pressable
                            style={({ pressed }) => [
                                styles.submitSensorButton,
                                { opacity: isSensorSubmitting ? 0.6 : pressed ? 0.82 : 1 },
                            ]}
                            onPress={handleManualSensorSubmit}
                            disabled={isSensorSubmitting}
                        >
                            {isSensorSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Feather name="upload-cloud" size={20} color="#fff" />
                            )}
                            <Text style={styles.submitSensorButtonText}>
                                {isSensorSubmitting ? 'Mengirim...' : 'Kirim Data Sensor'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aksi Cepat</Text>
                    <View style={styles.actionGrid}>
                        <ActionPressable 
                            title="Beri Pakan" 
                            subtitle="Sekarang" 
                            icon="send" 
                            actionColor={COLOR_ORANGE}
                            onPerformAction={handleFeedAction}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mode Otomatis</Text>
                    <Pressable
                        style={({ pressed }) => [
                            styles.feederCard,
                            { 
                                backgroundColor: isFeederActive ? '#10b98120' : '#fefefe', 
                                borderColor: isFeederActive ? '#10b981' : '#cbd5e1',
                                opacity: pressed ? 0.95 : 1,
                            }
                        ]}
                        onPress={() => {
                            setIsFeederActive(prev => !prev);
                            Alert.alert('Feeder Otomatis', `Feeder Otomatis telah ${!isFeederActive ? 'diaktifkan' : 'dimatikan'}.`);
                        }}
                    >
                        <View style={styles.controlInfo}>
                            <Feather name="clock" size={24} color={isFeederActive ? '#10b981' : '#6b7280'} />
                            <Text style={[styles.feederTitle, { color: isFeederActive ? '#10b981' : '#1f2937' }]}>
                                Feeder Otomatis
                            </Text>
                        </View>
                        <View style={[styles.controlStatusButton, { backgroundColor: isFeederActive ? '#10b981' : '#ef4444' }]}>
                            <Text style={styles.controlStatusText}>
                                {isFeederActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                        </View>
                    </Pressable>
                </View>

                <View style={styles.section}>
                    <View style={styles.recommendationHeader}>
                        <Feather name="trending-up" size={20} color="#10b981" />
                        <Text style={styles.recommendationTitle}>Rekomendasi AI</Text>
                    </View>
                    <View style={styles.recommendationList}>
                        {recommendationData.map(item => (
                            <RecommendationCard key={item.id} item={item} />
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

export default ExplorePage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },

    section: {
        paddingHorizontal: 15,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 10,
    },

    mainControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    successText: {
        color: '#059669',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -5,
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    loadingText: {
        color: '#4b5563',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
    },
    mainControlCard: {
        flex: 1,
        height: 150,
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 5,
        borderWidth: 2,
    },
    controlIcon: {
        marginTop: 10,
    },
    controlTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    controlStatusButton: {
        paddingHorizontal: 15,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 8,
    },
    controlStatusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },

    manualSensorCard: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        padding: 14,
    },
    manualInputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    manualInputGroup: {
        width: '31.5%',
    },
    manualInputLabel: {
        color: '#4b5563',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    manualInput: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        paddingHorizontal: 10,
        backgroundColor: '#f9fafb',
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '600',
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    presetButton: {
        width: '48.5%',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 10,
        marginBottom: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    presetButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    submitSensorButton: {
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitSensorButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 8,
    },

    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    actionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 20,
        marginHorizontal: 5,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 8,
    },
    actionSubtitle: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.8,
    },

    feederCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 2,
    },
    controlInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    feederTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 15,
    },
    
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    recommendationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 8,
    },
    recommendationList: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    recommendationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    recommendationIconWrapper: {
        width: 35,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 2,
    },
    recommendationText: {
        flex: 1,
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
        marginLeft: 15,
    },
});
