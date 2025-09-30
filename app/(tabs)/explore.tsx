import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_GRADIENT = ['#3b82f6', '#10b981'] as const;
const COLOR_BLUE = '#60a5fa';
const COLOR_YELLOW = '#facc15';
const COLOR_ORANGE = '#f97316';

interface ControlItem {
    id: 'pompa' | 'lampu';
    title: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
}

const controlItems: ControlItem[] = [
    { id: 'pompa', title: 'Pompa Air', icon: 'droplet', color: COLOR_BLUE },
    { id: 'lampu', title: 'Lampu LED', icon: 'sun', color: COLOR_YELLOW },
];

interface RecommendationItem {
    id: number;
    text: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
}

const recommendationData: RecommendationItem[] = [
    { id: 1, text: 'Kondisi optimal untuk pertumbuhan sayur', icon: 'check-circle', color: '#10b981' },
    { id: 2, text: 'Pertimbangkan panen kangkung minggu ini', icon: 'alert-triangle', color: '#facc15' },
    { id: 3, text: 'Berapa Ph air dengan kualitas terbaik', icon: 'droplet', color: '#3b82f6' },
];

const MainControlCard: React.FC<ControlItem> = ({ id, title, icon, color }) => {
    const [isOn, setIsOn] = useState(true); // Default ON

    const handlePress = () => {
        setIsOn(prev => !prev);
        Alert.alert(title, `${title} telah ${!isOn ? 'diaktifkan (ON)' : 'dimatikan (OFF)'}.`);
    };

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
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={handlePress}
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

    const handleFeedAction = () => {
        Alert.alert('Aksi Pakan', 'Pakan ikan telah dikeluarkan sekarang.');
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
                    <View style={styles.mainControlsRow}>
                        {controlItems.map(item => (
                            <MainControlCard key={item.id} {...item} />
                        ))}
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
