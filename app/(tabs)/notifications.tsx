import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { apiGet } from '@/constants/api';

const PRIMARY_GRADIENT = ['#3b82f6', '#10b981'] as const;
const COLOR_DANGER = '#ef4444';
const COLOR_WARNING = '#facc15';
const COLOR_INFO = '#3b82f6';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'critical' | 'warning' | 'info';
    time: string;
    icon: keyof typeof Feather.glyphMap;
    date: string;
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
                styles.notifCard,
                { backgroundColor: pressed ? '#f3f4f6' : '#fff' },
            ]}
            onPress={() => Alert.alert(notification.title, notification.message)}
        >
            <View style={[styles.notifIconWrapper, { backgroundColor: iconBgColor }]}>
                <Feather name={notification.icon} size={24} color={iconColor} />
            </View>
            <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: iconColor }]}>{notification.title}</Text>
                <Text style={styles.notifMessage} numberOfLines={2}>{notification.message}</Text>
                <Text style={styles.notifTime}>{notification.time}</Text>
            </View>
        </Pressable>
    );
};

const NotificationsPage: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const handleClearAll = () => {
        if (notifications.length === 0) {
            Alert.alert('Kosong', 'Tidak ada notifikasi untuk dihapus.');
            return;
        }

        Alert.alert(
            'Konfirmasi',
            'Anda yakin ingin menghapus semua notifikasi dari tampilan saat ini?',
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => setNotifications([]) },
            ],
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                <LinearGradient
                    colors={PRIMARY_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Pusat Notifikasi</Text>
                    <View style={styles.headerActions}>
                        <Pressable
                            onPress={fetchNotifications}
                            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
                            disabled={isLoading}
                        >
                            <Feather name="refresh-cw" size={18} color="#fff" />
                        </Pressable>
                        <Pressable
                            onPress={handleClearAll}
                            style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.7 : 1 }]}
                        >
                            <Feather name="trash-2" size={18} color="#fff" />
                            <Text style={styles.clearButtonText}>Hapus Semua</Text>
                        </Pressable>
                    </View>
                </LinearGradient>

                <View style={styles.contentArea}>
                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    {isLoading ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingText}>Memuat notifikasi sistem...</Text>
                        </View>
                    ) : Object.keys(groupedNotifications).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="bell-off" size={60} color="#9ca3af" style={{ marginBottom: 15 }} />
                            <Text style={styles.emptyStateText}>Tidak ada notifikasi saat ini.</Text>
                            <Text style={styles.emptyStateSubtitle}>Status sistem Anda dalam kondisi baik.</Text>
                        </View>
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
        marginBottom: 10,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginRight: 8,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    contentArea: {
        paddingHorizontal: 15,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6,
        marginBottom: 8,
    },
    loadingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    loadingText: {
        color: '#4b5563',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 10,
    },
    dateGroup: {
        marginBottom: 20,
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4b5563',
        marginBottom: 10,
        marginTop: 10,
    },
    notifCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
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
        fontWeight: '700',
    },
    notifMessage: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    notifTime: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 5,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        marginTop: 50,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4b5563',
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 5,
    },
});
