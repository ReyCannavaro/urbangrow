import React, { useState } from 'react'; // <--- PERBAIKAN DI SINI: useState ditambahkan
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Platform, 
    Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Warna Kunci Konsisten
const PRIMARY_GRADIENT = ['#3b82f6', '#10b981'] as const;
const COLOR_DANGER = '#ef4444'; // Merah untuk Peringatan/Kritis
const COLOR_WARNING = '#facc15'; // Kuning untuk Peringatan Sedang
const COLOR_INFO = '#3b82f6'; // Biru untuk Informasi

// --- Tipe Data dan Data Mock ---
interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'critical' | 'warning' | 'info';
    time: string;
    icon: keyof typeof Feather.glyphMap;
    date: string; // Untuk pengelompokan
}

const mockNotifications: Notification[] = [
    // Hari Ini
    { id: 1, title: 'PH Kritis Rendah!', message: 'Kadar pH air terdeteksi 5.9. Segera periksa dan sesuaikan.', type: 'critical', time: '10:30', icon: 'alert-triangle', date: 'Hari Ini' },
    { id: 2, title: 'Pompa Aktif Otomatis', message: 'Pompa air dihidupkan sesuai jadwal otomatis.', type: 'info', time: '07:00', icon: 'droplet', date: 'Hari Ini' },
    { id: 3, title: 'Pakan Keluar', message: 'Pakan ikan berhasil dikeluarkan otomatis.', type: 'info', time: '06:00', icon: 'send', date: 'Hari Ini' },
    
    // Kemarin
    { id: 4, title: 'Suhu Tinggi Terdeteksi', message: 'Suhu air mencapai 30.5°C. Pertimbangkan pendinginan.', type: 'warning', time: '18:45', icon: 'thermometer', date: 'Kemarin' },
    { id: 5, title: 'Koneksi Stabil Kembali', message: 'Koneksi jaringan sistem Aquaponik kembali stabil.', type: 'info', time: '12:15', icon: 'wifi', date: 'Kemarin' },
];

// --- Komponen Kartu Notifikasi ---
const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
    let iconColor;
    let iconBgColor;
    const iconName = notification.icon;

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
                { backgroundColor: pressed ? '#f3f4f6' : '#fff' }
            ]}
            onPress={() => Alert.alert(notification.title, notification.message)}
        >
            <View style={[styles.notifIconWrapper, { backgroundColor: iconBgColor }]}>
                <Feather name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: iconColor }]}>{notification.title}</Text>
                <Text style={styles.notifMessage} numberOfLines={2}>{notification.message}</Text>
                <Text style={styles.notifTime}>{notification.time}</Text>
            </View>
        </Pressable>
    );
};


// =======================================================
//                  HALAMAN NOTIFIKASI UTAMA
// =======================================================

const NotificationsPage: React.FC = () => {
    const insets = useSafeAreaInsets();
    
    // State untuk notifikasi (agar bisa dihapus)
    const [notifications, setNotifications] = useState(mockNotifications);

    // Mengelompokkan notifikasi berdasarkan tanggal
    const groupedNotifications = notifications.reduce((acc, notif) => {
        const date = notif.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(notif);
        return acc;
    }, {} as Record<string, Notification[]>);

    const handleClearAll = () => {
        if (notifications.length === 0) {
            Alert.alert('Kosong', 'Tidak ada notifikasi untuk dihapus.');
            return;
        }

        Alert.alert(
            'Konfirmasi',
            'Anda yakin ingin menghapus semua notifikasi?',
            [
                { text: 'Batal', style: 'cancel' },
                { text: 'Hapus', style: 'destructive', onPress: () => setNotifications([]) },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

                {/* Header Gradient (Gaya sesuai index.tsx & explore.tsx) */}
                <LinearGradient
                    colors={PRIMARY_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}>
                    <Text style={styles.headerTitle}>Pusat Notifikasi</Text>
                    {/* Tombol Hapus Semua */}
                    <Pressable 
                        onPress={handleClearAll} 
                        style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <Feather name="trash-2" size={18} color="#fff" />
                        <Text style={styles.clearButtonText}>Hapus Semua</Text>
                    </Pressable>
                </LinearGradient>

                <View style={styles.contentArea}>
                    {Object.keys(groupedNotifications).length === 0 ? (
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
                                    <NotificationCard key={notif.id} notification={notif} />
                                ))}
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

// export default NotificationsPage; // PENTING: Jangan export di sini jika ini adalah file tab

// =======================================================
//                           STYLES
// =======================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },

    // --- Header Gradient (Sesuai index.tsx & explore.tsx) ---
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

    // --- Notifikasi ---
    contentArea: {
        paddingHorizontal: 15,
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
    
    // --- Empty State ---
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

export default NotificationsPage;