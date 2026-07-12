import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatusButtonProps {
  label: string;
  value: string;
  borderColor: string;
}

export const StatusButton: React.FC<StatusButtonProps> = ({ label, value, borderColor }) => {
  const isActiveStatus = value === 'ON';

  return (
    <View style={[styles.statusButton, { borderColor }]}>
      <View style={styles.statusHeader}>
        <Text style={[styles.statusButtonLabel, { color: borderColor }]}>{label}</Text>
        {value === 'ON' || value === 'OFF' ? (
          <View style={[styles.statusDot, { backgroundColor: isActiveStatus ? '#10b981' : '#94a3b8' }]} />
        ) : null}
      </View>
      <Text style={[styles.statusButtonValue, value === 'ON' && styles.statusButtonValueActive]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusButton: {
    width: '48.5%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusButtonLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 8,
  },
  statusButtonValue: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
    marginTop: 6,
  },
  statusButtonValueActive: {
    color: '#1f2937',
  },
});
