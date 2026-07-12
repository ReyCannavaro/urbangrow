import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '@/constants/api';
import { AppTheme } from '@/constants/theme';
import { GlassBackground } from '@/components/ui/GlassBackground';
import { GlassPanel } from '@/components/ui/GlassPanel';

const COLOR_DANGER = AppTheme.color.danger;
const COLOR_WARNING = AppTheme.color.warning;
const COLOR_INFO = AppTheme.color.info;

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'critical' | 'warning' | 'info';
    time: string;
    icon: keyof typeof Feather.glyphMap;
    date: string;
}

interface ClearNotificationsResponse {
    message: string;
    cleared: number;
}

const fallbackNotifications: Notification[] = [
    {
        id: 1,
        title: 'API Tidak Terhubung',
        message: 'Notifikasi real belum dapat dimuat. Pastikan backend UrbanGrow sedang berjalan.',
        type: 'warning',
        time: '--:--',
        icon: 'wifi-off',
        date: 'Status Sistem',
    },
];

const normalizeNotification = (item: Partial<Notification>, index: number): Notification => ({
    id: Number(item.id ?? index + 1),
    title: item.title ?? 'Notifikasi Sistem',
    message: item.message ?? 'Tidak ada detail tambahan.',
    type: item.type === 'critical' || item.type === 'warning' || item.type === 'info' ? item.type : 'info',
    time: item.time ?? '--:--',
    icon: item.icon ?? 'bell',
    date: item.date ?? 'Hari Ini',
});

const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
    let iconColor;
    let iconBgColor;

    switch (notification.type) {
        case 'critical':
            iconColor = COLOR_DANGER;
            iconBgColor = COLOR_DANGER + '20';
            break;
        case 'warning':
            iconColor = COLOR_WARNING;
            iconBgColor = COLOR_WARNING + '20';
            break;
        case 'info':
        default:
            iconColor = COLOR_INFO;
            iconBgColor = COLOR_INFO + '20';
            break;
    }

    return (
        <Pressable
            style={({ pressed }) => [
                styles.notifPressable,
                { opacity: pressed ? 0.78 : 1 },
            ]}
            onPress={() => Alert.alert(notification.title, notification.message)}
        >
            <GlassPanel style={styles.notifCard} contentStyle={styles.notifCardContent} intensity={58} variant="strong">
                <View style={[styles.notifIconWrapper, { backgroundColor: iconBgColor }]}>
                    <Feather name={notification.icon} size={24} color={iconColor} />
                </View>
                <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: iconColor }]}>{notification.title}</Text>
                    <Text style={styles.notifMessage} numberOfLines={2}>{notification.message}</Text>
                    <Text style={styles.notifTime}>{notification.time}</Text>
                </View>
            </GlassPanel>
        </Pressable>
    );
};

const NotificationsPage: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await apiGet<Partial<Notification>[]>('/api/notifications');
            setNotifications(response.map(normalizeNotification));
            setErrorMessage('');
        } catch (error) {
            console.warn('Failed to load notifications:', error);
            setNotifications(fallbackNotifications);
            setErrorMessage('Tidak dapat memuat notifikasi real dari API.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const groupedNotifications = notifications.reduce((acc, notif) => {
        if (!acc[notif.date]) {
            acc[notif.date] = [];
        }

        acc[notif.date].push(notif);
        return acc;
    }, {} as Record<string, Notification[]>);

    const clearAllNotifications = async () => {
        setIsClearing(true);

        try {
            await apiPost<ClearNotificationsResponse>('/api/notifications/clear', {});
            setNotifications([]);
            setErrorMessage('');
        } catch (error) {
            console.warn('Failed to clear persisted notifications:', error);
            setNotifications([]);
            setErrorMessage('API belum dapat menghapus riwayat. Notifikasi hanya dibersihkan dari tampilan saat ini.');
        } finally {
            setIsClearing(false);
        }
    };

    const handleClearAll = () => {
        if (notifications.length === 0) {
            Alert.alert('Kosong', 'Tidak ada notifikasi untuk dihapus.');
            return;
        }

        Alert.alert(
            'Konfirmasi',
            'Anda yakin ingin menghapus semua riwayat notifikasi?',
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: clearAllNotifications },
            ],
        );
    };

    return (
        <View style={styles.container}>
            <GlassBackground />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}>
                <GlassPanel style={styles.header} contentStyle={styles.headerInner} intensity={72} variant="strong">
                    <View style={styles.headerTitleRow}>
                        <View style={styles.headerIcon}>
                            <Feather name="bell" size={22} color={AppTheme.color.primaryDark} />
                        </View>
                        <View style={styles.headerCopy}>
                            <Text style={styles.headerEyebrow}>System Log</Text>
                            <Text style={styles.headerTitle}>Pusat Notifikasi</Text>
                            <Text style={styles.headerSubtitle}>Peringatan dan catatan dari UrbanGrow.</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <Pressable
                            onPress={fetchNotifications}
                            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
                            disabled={isLoading}
                        >
                            <Feather name="refresh-cw" size={18} color={AppTheme.color.surfaceStrong} />
                        </Pressable>
                        <Pressable
                            onPress={handleClearAll}
                            style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.7 : 1 }]}
                            disabled={isClearing}
                        >
                            {isClearing ? (
                                <ActivityIndicator size="small" color={AppTheme.color.surface} />
                            ) : (
                                <Feather name="trash-2" size={18} color={AppTheme.color.surface} />
                            )}
                            <Text style={styles.clearButtonText}>
                                {isClearing ? 'Menghapus...' : 'Hapus Semua'}
                            </Text>
                        </Pressable>
                    </View>
                </GlassPanel>

                <View style={styles.contentArea}>
                    {errorMessage ? (
                        <View style={styles.errorBanner}>
                            <Feather name="alert-circle" size={16} color={AppTheme.color.danger} />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    {isLoading ? (
                        <View style={styles.loadingState}>
                            {[0, 1, 2].map(item => (
                                <GlassPanel key={item} style={styles.loadingCard} contentStyle={styles.loadingCardContent} intensity={50} variant="strong">
                                    <View style={styles.loadingIconBlock} />
                                    <View style={styles.loadingCopyBlock}>
                                        <View style={styles.loadingTitleBlock} />
                                        <View style={styles.loadingLineBlock} />
                                    </View>
                                </GlassPanel>
                            ))}
                        </View>
                    ) : Object.keys(groupedNotifications).length === 0 ? (
                        <GlassPanel style={styles.emptyState} contentStyle={styles.emptyStateContent} intensity={58} variant="strong">
                            <View style={styles.emptyIconWrap}>
                                <Feather name="bell-off" size={34} color={AppTheme.color.textMuted} />
                            </View>
                            <Text style={styles.emptyStateText}>Tidak ada notifikasi saat ini.</Text>
                            <Text style={styles.emptyStateSubtitle}>Status sistem Anda dalam kondisi baik.</Text>
                        </GlassPanel>
                    ) : (
                        Object.keys(groupedNotifications).map(date => (
                            <View key={date} style={styles.dateGroup}>
                                <Text style={styles.dateHeader}>{date}</Text>
                                {groupedNotifications[date].map(notif => (
                                    <NotificationCard key={`${notif.date}-${notif.id}`} notification={notif} />
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default NotificationsPage;

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
    headerTitleRow: {
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
        fontSize: 25,
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: AppTheme.color.primarySoft,
        marginRight: 8,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppTheme.color.danger,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: AppTheme.radius.pill,
    },
    clearButtonText: {
        color: AppTheme.color.surface,
        fontSize: 14,
        fontWeight: '800',
        marginLeft: 8,
    },
    contentArea: {
        paddingHorizontal: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f4b7ae',
        borderRadius: AppTheme.radius.input,
        backgroundColor: AppTheme.color.dangerSoft,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    errorText: {
        color: AppTheme.color.danger,
        fontSize: 13,
        lineHeight: 18,
        marginLeft: 8,
        flex: 1,
    },
    loadingState: {
        paddingVertical: 6,
    },
    loadingCard: {
        borderRadius: AppTheme.radius.card,
        marginBottom: 10,
    },
    loadingCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    loadingIconBlock: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: AppTheme.color.neutralSoft,
        marginRight: 14,
    },
    loadingCopyBlock: {
        flex: 1,
    },
    loadingTitleBlock: {
        width: '52%',
        height: 12,
        borderRadius: 6,
        backgroundColor: AppTheme.color.neutralSoft,
        marginBottom: 9,
    },
    loadingLineBlock: {
        width: '86%',
        height: 10,
        borderRadius: 5,
        backgroundColor: AppTheme.color.surfaceMuted,
    },
    dateGroup: {
        marginBottom: 20,
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: '900',
        color: AppTheme.color.textOnGlass,
        marginBottom: 10,
        marginTop: 10,
    },
    notifPressable: {
        marginBottom: 10,
    },
    notifCard: {
        borderRadius: AppTheme.radius.card,
    },
    notifCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    notifIconWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    notifContent: {
        flex: 1,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: '900',
    },
    notifMessage: {
        fontSize: 14,
        color: AppTheme.color.textMuted,
        marginTop: 2,
        lineHeight: 19,
    },
    notifTime: {
        fontSize: 12,
        color: AppTheme.color.textSubtle,
        marginTop: 5,
        fontWeight: '700',
    },
    emptyState: {
        marginTop: 26,
        borderRadius: AppTheme.radius.panel,
    },
    emptyStateContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 44,
        paddingHorizontal: 18,
    },
    emptyIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: AppTheme.color.neutralSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '900',
        color: AppTheme.color.text,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: AppTheme.color.textSubtle,
        marginTop: 5,
    },
});
