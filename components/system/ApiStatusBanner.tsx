import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/constants/api';
import { useApiStatus } from '@/hooks/use-api-status';

const formatLastChecked = (date: Date | null) => {
  if (!date) {
    return 'Belum dicek';
  }

  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ApiStatusBanner = () => {
  const insets = useSafeAreaInsets();
  const {
    isOnline,
    isSensorStale,
    sensorStaleMinutes,
    isChecking,
    lastCheckedAt,
    checkApiStatus,
  } = useApiStatus();

  if (isOnline && !isSensorStale) {
    return null;
  }

  const isOffline = !isOnline;
  const title = isOffline ? 'API offline' : 'Data sensor belum update';
  const message = isOffline
    ? `${API_BASE_URL} - cek terakhir ${formatLastChecked(lastCheckedAt)}`
    : `Update terakhir ${sensorStaleMinutes ?? 0} menit lalu - cek terakhir ${formatLastChecked(lastCheckedAt)}`;
  const iconName = isOffline ? 'wifi-off' : 'alert-triangle';
  const toneStyles = isOffline ? offlineTone : staleTone;

  return (
    <View style={[styles.banner, toneStyles.banner, { top: insets.top + 10 }]}>
      <View style={[styles.iconWrap, toneStyles.iconWrap]}>
        <Feather name={iconName} size={16} color={toneStyles.icon.color} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, toneStyles.title]}>{title}</Text>
        <Text style={[styles.message, toneStyles.message]} numberOfLines={1}>
          {message}
        </Text>
      </View>
      <Pressable
        onPress={checkApiStatus}
        disabled={isChecking}
        style={({ pressed }) => [
          styles.retryButton,
          toneStyles.iconWrap,
          { opacity: pressed || isChecking ? 0.65 : 1 },
        ]}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color={toneStyles.icon.color} />
        ) : (
          <Feather name="refresh-cw" size={16} color={toneStyles.icon.color} />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 200,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  retryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

const offlineTone = StyleSheet.create({
  banner: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  iconWrap: {
    backgroundColor: '#fee2e2',
  },
  title: {
    color: '#991b1b',
  },
  message: {
    color: '#b91c1c',
  },
  icon: {
    color: '#b91c1c',
  },
});

const staleTone = StyleSheet.create({
  banner: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  iconWrap: {
    backgroundColor: '#fef3c7',
  },
  title: {
    color: '#92400e',
  },
  message: {
    color: '#b45309',
  },
  icon: {
    color: '#b45309',
  },
});
