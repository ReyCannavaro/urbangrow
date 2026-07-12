import { Feather } from '@expo/vector-icons';
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
import {
    ActuatorCommand,
    ActuatorControlResponse,
    ActuatorKey,
    ActuatorStatus,
    apiGet,
    apiPost,
    DeviceSyncResponse,
    DeviceSyncStatus,
    normalizeActuatorStatus,
} from '@/constants/api';
import { AppTheme } from '@/constants/theme';
import { GlassBackground } from '@/components/ui/GlassBackground';
import { GlassPanel } from '@/components/ui/GlassPanel';

const COLOR_BLUE = AppTheme.color.info;
const COLOR_YELLOW = AppTheme.color.warning;
const COLOR_ORANGE = '#d66a24';
const COLOR_SUCCESS = AppTheme.color.primary;
const COLOR_DANGER = AppTheme.color.danger;

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
    { id: 1, text: 'Kondisi optimal untuk pertumbuhan sayur', icon: 'check-circle', color: AppTheme.color.primary },
    { id: 2, text: 'Pertimbangkan panen kangkung minggu ini', icon: 'alert-triangle', color: AppTheme.color.warning },
    { id: 3, text: 'Berapa pH air dengan kualitas terbaik', icon: 'droplet', color: AppTheme.color.info },
];

const sensorPresets: SensorPreset[] = [
    { id: 'normal', label: 'Normal', temperature: 26.8, ph: 6.8, ldrValue: 460, color: AppTheme.color.primary },
    { id: 'ph-low', label: 'pH Rendah', temperature: 26.4, ph: 5.6, ldrValue: 430, color: AppTheme.color.danger },
    { id: 'hot', label: 'Suhu Tinggi', temperature: 31.2, ph: 7.1, ldrValue: 410, color: '#d66a24' },
    { id: 'low-light', label: 'Cahaya Rendah', temperature: 25.9, ph: 6.9, ldrValue: 180, color: AppTheme.color.warning },
];

const getCommandStatusCopy = (command: ActuatorCommand) => {
    const actuatorName = command.actuator_key === 'pumpStatus' ? 'Pompa Air' : 'Lampu Grow';
    const targetLabel = command.target_value === 'ON' ? 'ON' : 'OFF';

    if (command.status === 'success') {
        return `${actuatorName} berhasil disetel ke ${targetLabel}.`;
    }

    if (command.status === 'failed') {
        return command.error_message || `${actuatorName} gagal disetel ke ${targetLabel}.`;
    }

    return `${actuatorName} menunggu eksekusi ESP untuk mode ${targetLabel}.`;
};

const getCommandStatusColor = (status: ActuatorCommand['status']) => {
    if (status === 'success') {
        return COLOR_SUCCESS;
    }

    if (status === 'failed') {
        return COLOR_DANGER;
    }

        return AppTheme.color.warning;
};

interface MainControlCardProps extends ControlItem {
    isDisabled: boolean;
    isOn: boolean;
    onToggle: (item: ControlItem, nextValue: 'ON' | 'OFF') => void;
}

const MainControlCard: React.FC<MainControlCardProps> = ({ title, icon, color, isDisabled, isOn, onToggle, ...item }) => {
    const cardStyle = {
        borderColor: isOn ? color : AppTheme.color.line,
    };

    const iconColor = isOn ? color : AppTheme.color.textMuted;
    const statusBgColor = isOn ? AppTheme.color.primarySoft : AppTheme.color.neutralSoft;
    const statusTextColor = isOn ? AppTheme.color.primaryDark : AppTheme.color.textMuted;

    return (
        <Pressable 
            style={({ pressed }) => [
                styles.mainControlPressable,
                { opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={() => onToggle({ ...item, title, icon, color }, isOn ? 'OFF' : 'ON')}
            disabled={isDisabled}
        >
            <GlassPanel style={[styles.mainControlCard, cardStyle]} contentStyle={styles.mainControlContent} intensity={58} variant="strong">
                <View style={[styles.controlIconShell, { backgroundColor: isOn ? `${color}18` : AppTheme.color.neutralSoft }]}>
                    <Feather
                        name={icon}
                        size={30}
                        color={iconColor}
                    />
                </View>
                <Text style={styles.controlTitleText}>{title}</Text>
                
                <View style={[styles.controlStatusButton, { backgroundColor: statusBgColor, borderColor: isOn ? color : AppTheme.color.lineStrong }]}>
                    <Text style={[styles.controlStatusText, { color: statusTextColor }]}>
                        {isOn ? 'ON' : 'OFF'}
                    </Text>
                </View>
            </GlassPanel>
        </Pressable>
    );
};

interface ActionCardProps {
    title: string;
    subtitle: string;
    icon: keyof typeof Feather.glyphMap;
    actionColor: string;
    onPerformAction: () => void;
    isDisabled?: boolean;
    isLoading?: boolean;
}

const ActionPressable: React.FC<ActionCardProps> = ({
    title,
    subtitle,
    icon,
    actionColor,
    onPerformAction,
    isDisabled = false,
    isLoading = false,
}) => {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.actionPressable,
                {
                  opacity: isDisabled ? 0.58 : pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                }
            ]}
            onPress={onPerformAction}
            disabled={isDisabled}
        >
            <GlassPanel
                style={[styles.actionCard, { borderColor: `${actionColor}55` }]}
                contentStyle={styles.actionContent}
                intensity={58}
                variant="strong"
            >
                <View style={[styles.actionIconShell, { backgroundColor: `${actionColor}18` }]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={actionColor} />
                ) : (
                    <Feather name={icon} size={24} color={actionColor} />
                )}
                </View>
                <Text style={styles.actionTitle}>{title}</Text>
                <Text style={styles.actionSubtitle}>{subtitle}</Text>
            </GlassPanel>
        </Pressable>
    );
};

const RecommendationCard: React.FC<{ item: RecommendationItem }> = ({ item }) => {
    return (
        <Pressable 
            style={({ pressed }) => [styles.recommendationCard, { backgroundColor: pressed ? AppTheme.color.surfaceMuted : 'transparent' }]}
            onPress={() => Alert.alert('Rekomendasi', item.text)}
        >
            <View style={[styles.recommendationIconWrapper, { backgroundColor: `${item.color}18`, borderColor: `${item.color}40` }]}>
                <Feather name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.recommendationText}>{item.text}</Text>
            <Feather name="chevron-right" size={20} color={AppTheme.color.textSubtle} />
        </Pressable>
    );
};

const ExplorePage: React.FC = () => {
    const insets = useSafeAreaInsets();
    
    const [isFeederActive, setIsFeederActive] = useState(false);
    const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({ pumpStatus: 'OFF', lightStatus: 'OFF' });
    const [isActuatorLoading, setIsActuatorLoading] = useState(true);
    const [activeControl, setActiveControl] = useState<ActuatorKey | null>(null);
    const [latestActuatorCommand, setLatestActuatorCommand] = useState<ActuatorCommand | null>(null);
    const [commandStatusMessage, setCommandStatusMessage] = useState('');
    const [syncStatus, setSyncStatus] = useState<DeviceSyncStatus | null>(null);
    const [isSyncingDevice, setIsSyncingDevice] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
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

    const fetchLatestActuatorCommand = useCallback(async () => {
        try {
            const commands = await apiGet<ActuatorCommand[]>('/api/actuator-commands?limit=1');
            setLatestActuatorCommand(commands[0] ?? null);
        } catch (error) {
            console.warn('Failed to load actuator command queue:', error);
        }
    }, []);

    const fetchSyncStatus = useCallback(async () => {
        try {
            const status = await apiGet<DeviceSyncStatus>('/api/sync-status');
            setSyncStatus(status);
        } catch (error) {
            console.warn('Failed to load sync status:', error);
        }
    }, []);

    useEffect(() => {
        fetchActuatorStatus();
        fetchLatestActuatorCommand();
        fetchSyncStatus();
    }, [fetchActuatorStatus, fetchLatestActuatorCommand, fetchSyncStatus]);

    const handleActuatorToggle = async (item: ControlItem, nextValue: 'ON' | 'OFF') => {
        setActiveControl(item.actuatorKey);
        setCommandStatusMessage('');
        setControlError('');

        try {
            const response = await apiPost<ActuatorControlResponse>('/api/actuator-control', {
                key: item.actuatorKey,
                value: nextValue,
            });

            setActuatorStatus(normalizeActuatorStatus(response.actuator));
            setLatestActuatorCommand(response.command);
            setCommandStatusMessage(getCommandStatusCopy(response.command));

            if (response.command.status === 'pending') {
                Alert.alert(item.title, 'Perintah masuk antrean dan menunggu ack dari ESP.');
            } else if (response.command.status === 'failed') {
                Alert.alert('Kontrol Gagal', getCommandStatusCopy(response.command));
            } else {
                Alert.alert(item.title, `${item.title} telah ${nextValue === 'ON' ? 'diaktifkan (ON)' : 'dimatikan (OFF)'}.`);
            }
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

    const handleDeviceSync = async () => {
        setIsSyncingDevice(true);
        setSyncMessage('');

        try {
            const response = await apiPost<DeviceSyncResponse>('/api/sync-device', {
                trigger: 'manual',
                reason: 'User meminta perangkat menyambungkan ulang sensor dari aplikasi.',
                force: true,
            });
            setSyncStatus(response.sync_status);
            setSyncMessage(response.sync.message || 'Sync perangkat berhasil dikirim.');

            if (response.sync.status === 'pending' || response.sync.status === 'syncing') {
                Alert.alert('Sync Alat', 'Permintaan sync masuk antrean dan menunggu respons ESP.');
            } else if (response.sync.status === 'failed') {
                Alert.alert('Sync Gagal', response.sync.message || 'Perangkat belum merespons sync.');
            } else {
                Alert.alert('Sync Alat', response.sync.message || 'Perangkat berhasil menjalankan sync.');
            }
        } catch (error) {
            console.warn('Failed to request device sync:', error);
            setSyncMessage('Gagal meminta sync perangkat. Pastikan API sedang berjalan.');
            Alert.alert('Sync Gagal', 'Permintaan sync belum terkirim ke API.');
        } finally {
            setIsSyncingDevice(false);
        }
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
            <GlassBackground />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}>

                <GlassPanel style={styles.header} contentStyle={styles.headerInner} intensity={72} variant="strong">
                    <View style={styles.headerTop}>
                        <View style={styles.headerIcon}>
                            <Feather name="sliders" size={22} color={AppTheme.color.primaryDark} />
                        </View>
                        <View style={styles.headerCopy}>
                            <Text style={styles.headerEyebrow}>Control Center</Text>
                            <Text style={styles.headerTitle}>Kontrol Sistem</Text>
                            <Text style={styles.headerSubtitle}>Kirim perintah, sync alat, dan input sensor manual.</Text>
                        </View>
                    </View>
                    <View style={styles.headerMetaRow}>
                        <View style={styles.headerMetaItem}>
                            <Text style={styles.headerMetaLabel}>Pompa</Text>
                            <Text style={styles.headerMetaValue}>{actuatorStatus.pumpStatus}</Text>
                        </View>
                        <View style={styles.headerMetaItem}>
                            <Text style={styles.headerMetaLabel}>Lampu</Text>
                            <Text style={styles.headerMetaValue}>{actuatorStatus.lightStatus}</Text>
                        </View>
                        <View style={styles.headerMetaItem}>
                            <Text style={styles.headerMetaLabel}>Sync</Text>
                            <Text style={styles.headerMetaValue}>{syncStatus?.status ?? 'cek'}</Text>
                        </View>
                    </View>
                </GlassPanel>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Kontrol Perangkat</Text>
                        <Text style={styles.sectionSubtitle}>Perintah masuk antrean dan menunggu ack ESP.</Text>
                    </View>
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
                            <ActivityIndicator size="small" color={AppTheme.color.primary} />
                            <Text style={styles.loadingText}>Memuat status perangkat...</Text>
                        </View>
                    ) : null}
                    {latestActuatorCommand ? (
                        <GlassPanel
                            style={[
                                styles.commandStatusCard,
                                { borderColor: getCommandStatusColor(latestActuatorCommand.status) },
                            ]}
                            contentStyle={styles.commandStatusContent}
                            intensity={58}
                            variant="strong"
                        >
                            <View style={styles.commandStatusHeader}>
                                <Text
                                    style={[
                                        styles.commandStatusBadge,
                                        { color: getCommandStatusColor(latestActuatorCommand.status) },
                                    ]}
                                >
                                    {latestActuatorCommand.status.toUpperCase()}
                                </Text>
                                <Text style={styles.commandStatusMeta}>
                                    #{latestActuatorCommand.id} - {latestActuatorCommand.delivery_method}
                                </Text>
                            </View>
                            <Text style={styles.commandStatusText}>
                                {commandStatusMessage || getCommandStatusCopy(latestActuatorCommand)}
                            </Text>
                            <Text style={styles.commandStatusHint}>
                                Device: {latestActuatorCommand.device_id} | Attempts: {latestActuatorCommand.attempts}
                            </Text>
                        </GlassPanel>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Input Sensor Manual</Text>
                        <Text style={styles.sectionSubtitle}>Untuk simulasi, kalibrasi, atau pengujian API.</Text>
                    </View>
                    <GlassPanel style={styles.manualSensorCard} contentStyle={styles.manualSensorContent} intensity={60} variant="strong">
                        <View style={styles.manualInputRow}>
                            <View style={styles.manualInputGroup}>
                                <Text style={styles.manualInputLabel}>Suhu</Text>
                                <TextInput
                                    style={styles.manualInput}
                                    value={manualSensorForm.temperature}
                                    onChangeText={value => setSensorField('temperature', value)}
                                    keyboardType="decimal-pad"
                                    placeholder="26.8"
                                    placeholderTextColor={AppTheme.color.textSubtle}
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
                                    placeholderTextColor={AppTheme.color.textSubtle}
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
                                    placeholderTextColor={AppTheme.color.textSubtle}
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
                                <ActivityIndicator size="small" color={AppTheme.color.surface} />
                            ) : (
                                <Feather name="upload-cloud" size={20} color={AppTheme.color.surface} />
                            )}
                            <Text style={styles.submitSensorButtonText}>
                                {isSensorSubmitting ? 'Mengirim...' : 'Kirim Data Sensor'}
                            </Text>
                        </Pressable>
                    </GlassPanel>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
                        <Text style={styles.sectionSubtitle}>Operasi sekali tekan untuk feeder dan reconnect.</Text>
                    </View>
                    <View style={styles.actionGrid}>
                        <ActionPressable 
                            title="Beri Pakan" 
                            subtitle="Sekarang" 
                            icon="send" 
                            actionColor={COLOR_ORANGE}
                            onPerformAction={handleFeedAction}
                        />
                        <ActionPressable
                            title="Sync Alat"
                            subtitle={isSyncingDevice ? 'Mengirim' : 'Reconnect'}
                            icon="refresh-cw"
                            actionColor={COLOR_BLUE}
                            onPerformAction={handleDeviceSync}
                            isDisabled={isSyncingDevice}
                            isLoading={isSyncingDevice}
                        />
                    </View>
                    {syncStatus ? (
                        <GlassPanel
                            style={[
                                styles.syncStatusCard,
                                { borderColor: getCommandStatusColor(syncStatus.status === 'stale' ? 'failed' : syncStatus.status === 'success' ? 'success' : 'pending') },
                            ]}
                            contentStyle={styles.commandStatusContent}
                            intensity={58}
                            variant="strong"
                        >
                            <View style={styles.commandStatusHeader}>
                                <Text style={styles.commandStatusMeta}>Sync System</Text>
                                <Text
                                    style={[
                                        styles.commandStatusBadge,
                                        {
                                            color: getCommandStatusColor(
                                                syncStatus.status === 'stale'
                                                    ? 'failed'
                                                    : syncStatus.status === 'success'
                                                        ? 'success'
                                                        : 'pending',
                                            ),
                                        },
                                    ]}
                                >
                                    {syncStatus.status.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.commandStatusText}>
                                {syncMessage || syncStatus.reason}
                            </Text>
                            <Text style={styles.commandStatusHint}>
                                Update sensor: {syncStatus.minutes_since_update ?? '-'} menit lalu
                            </Text>
                        </GlassPanel>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Mode Otomatis</Text>
                    </View>
                    <Pressable
                        style={({ pressed }) => [
                            styles.feederPressable,
                            {
                                opacity: pressed ? 0.95 : 1,
                            }
                        ]}
                        onPress={() => {
                            setIsFeederActive(prev => !prev);
                            Alert.alert('Feeder Otomatis', `Feeder Otomatis telah ${!isFeederActive ? 'diaktifkan' : 'dimatikan'}.`);
                        }}
                    >
                        <GlassPanel
                            style={[
                                styles.feederCard,
                                { borderColor: isFeederActive ? AppTheme.color.primary : AppTheme.color.line },
                            ]}
                            contentStyle={styles.feederContent}
                            intensity={58}
                            variant="strong"
                        >
                            <View style={styles.controlInfo}>
                                <Feather name="clock" size={24} color={isFeederActive ? AppTheme.color.primary : AppTheme.color.textMuted} />
                                <Text style={[styles.feederTitle, { color: isFeederActive ? AppTheme.color.primaryDark : AppTheme.color.text }]}>
                                    Feeder Otomatis
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.controlStatusButton,
                                    {
                                        backgroundColor: isFeederActive ? AppTheme.color.primarySoft : AppTheme.color.neutralSoft,
                                        borderColor: isFeederActive ? AppTheme.color.primary : AppTheme.color.lineStrong,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.controlStatusText,
                                        { color: isFeederActive ? AppTheme.color.primaryDark : AppTheme.color.textMuted },
                                    ]}
                                >
                                    {isFeederActive ? 'ACTIVE' : 'INACTIVE'}
                                </Text>
                            </View>
                        </GlassPanel>
                    </Pressable>
                </View>

                <View style={styles.section}>
                    <View style={styles.recommendationHeader}>
                        <Feather name="trending-up" size={20} color={AppTheme.color.primary} />
                        <Text style={styles.recommendationTitle}>Rekomendasi AI</Text>
                    </View>
                    <GlassPanel style={styles.recommendationList} contentStyle={styles.recommendationContent} intensity={58} variant="strong">
                        {recommendationData.map(item => (
                            <RecommendationCard key={item.id} item={item} />
                        ))}
                    </GlassPanel>
                </View>

            </ScrollView>
        </View>
    );
};

export default ExplorePage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppTheme.color.canvas,
    },

    header: {
        justifyContent: 'space-between',
        alignItems: 'stretch',
        marginTop: 25,
        marginBottom: 14,
        marginHorizontal: 16,
        borderRadius: AppTheme.radius.panel,
        minHeight: 166,
    },
    headerInner: {
        padding: 18,
        minHeight: 166,
        justifyContent: 'space-between',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppTheme.color.primarySoft,
        borderWidth: 1,
        borderColor: AppTheme.color.lineStrong,
        marginRight: 12,
    },
    headerCopy: {
        flex: 1,
        minWidth: 0,
    },
    headerEyebrow: {
        color: AppTheme.color.textMuted,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: AppTheme.color.text,
    },
    headerSubtitle: {
        color: AppTheme.color.textMuted,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        fontWeight: '600',
    },
    headerMetaRow: {
        flexDirection: 'row',
        marginTop: 18,
    },
    headerMetaItem: {
        flex: 1,
        borderWidth: 1,
        borderColor: AppTheme.color.line,
        backgroundColor: 'rgba(255,255,255,0.30)',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginRight: 8,
    },
    headerMetaLabel: {
        color: AppTheme.color.textMuted,
        fontSize: 11,
        fontWeight: '800',
    },
    headerMetaValue: {
        color: AppTheme.color.text,
        fontSize: 13,
        fontWeight: '900',
        marginTop: 2,
    },

    section: {
        paddingHorizontal: 16,
        marginTop: 18,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: AppTheme.color.textOnGlass,
    },
    sectionSubtitle: {
        color: AppTheme.color.textOnGlassMuted,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '700',
        marginTop: 3,
    },

    mainControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    errorText: {
        color: COLOR_DANGER,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f4b7ae',
        borderRadius: AppTheme.radius.input,
        backgroundColor: AppTheme.color.dangerSoft,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    successText: {
        color: AppTheme.color.primaryDark,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#bfe8d6',
        borderRadius: AppTheme.radius.input,
        backgroundColor: AppTheme.color.primaryMist,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -5,
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    loadingText: {
        color: AppTheme.color.textOnGlassMuted,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 8,
    },
    commandStatusCard: {
        borderRadius: AppTheme.radius.card,
        marginHorizontal: 0,
        marginBottom: 12,
    },
    commandStatusContent: {
        padding: 12,
    },
    syncStatusCard: {
        borderRadius: AppTheme.radius.card,
        marginHorizontal: 0,
        marginTop: 2,
        marginBottom: 8,
    },
    commandStatusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    commandStatusBadge: {
        fontSize: 12,
        fontWeight: '900',
    },
    commandStatusMeta: {
        color: AppTheme.color.textSubtle,
        fontSize: 12,
        fontWeight: '800',
    },
    commandStatusText: {
        color: AppTheme.color.text,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '700',
    },
    commandStatusHint: {
        color: AppTheme.color.textMuted,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
    },
    mainControlPressable: {
        flex: 1,
        marginHorizontal: 5,
    },
    mainControlCard: {
        borderRadius: AppTheme.radius.card,
    },
    mainControlContent: {
        minHeight: 148,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    controlIconShell: {
        width: 54,
        height: 54,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    controlTitleText: {
        fontSize: 16,
        fontWeight: '800',
        color: AppTheme.color.text,
        marginTop: 10,
    },
    controlStatusButton: {
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: AppTheme.radius.pill,
        borderWidth: 1,
        marginTop: 8,
    },
    controlStatusText: {
        fontWeight: '900',
        fontSize: 13,
    },

    manualSensorCard: {
        borderRadius: AppTheme.radius.panel,
    },
    manualSensorContent: {
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
        color: AppTheme.color.textMuted,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 6,
    },
    manualInput: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: AppTheme.color.lineStrong,
        borderRadius: AppTheme.radius.input,
        paddingHorizontal: 10,
        backgroundColor: AppTheme.color.surfaceMuted,
        color: AppTheme.color.text,
        fontSize: 14,
        fontWeight: '800',
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    presetButton: {
        width: '48.5%',
        borderWidth: 1,
        borderRadius: AppTheme.radius.input,
        paddingVertical: 9,
        paddingHorizontal: 10,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.56)',
        alignItems: 'center',
    },
    presetButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    submitSensorButton: {
        minHeight: 46,
        borderRadius: AppTheme.radius.input,
        backgroundColor: AppTheme.color.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitSensorButtonText: {
        color: AppTheme.color.surface,
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 8,
    },

    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    actionPressable: {
        flex: 1,
        marginHorizontal: 5,
    },
    actionCard: {
        borderRadius: AppTheme.radius.card,
    },
    actionContent: {
        alignItems: 'flex-start',
        padding: 14,
        minHeight: 130,
    },
    actionIconShell: {
        width: 42,
        height: 42,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: AppTheme.color.text,
    },
    actionSubtitle: {
        fontSize: 12,
        color: AppTheme.color.textMuted,
        fontWeight: '700',
        marginTop: 3,
    },

    feederPressable: {
        width: '100%',
    },
    feederCard: {
        borderRadius: AppTheme.radius.panel,
    },
    feederContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    controlInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    feederTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 15,
    },
    
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    recommendationTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: AppTheme.color.textOnGlass,
        marginLeft: 8,
    },
    recommendationList: {
        borderRadius: AppTheme.radius.panel,
    },
    recommendationContent: {
        paddingVertical: 5,
    },
    recommendationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: AppTheme.color.line,
    },
    recommendationIconWrapper: {
        width: 35,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
    },
    recommendationText: {
        flex: 1,
        fontSize: 15,
        color: AppTheme.color.text,
        fontWeight: '700',
        marginLeft: 15,
    },
});
