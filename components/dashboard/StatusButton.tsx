import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';

interface StatusButtonProps {
  label: string;
  value: string;
  borderColor: string;
}

export const StatusButton: React.FC<StatusButtonProps> = ({ label, value, borderColor }) => {
  const isActiveStatus = value === 'ON';
  const isBinaryStatus = value === 'ON' || value === 'OFF';
  const displayValue = isBinaryStatus ? (isActiveStatus ? 'Aktif' : 'Standby') : value;

  return (
    <View style={styles.statusButton}>
      <View style={styles.statusHeader}>
        <Text style={styles.statusButtonLabel}>{label}</Text>
        {isBinaryStatus ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isActiveStatus ? AppTheme.color.primarySoft : AppTheme.color.neutralSoft,
                borderColor: isActiveStatus ? AppTheme.color.primary : AppTheme.color.lineStrong,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isActiveStatus ? AppTheme.color.primaryDark : AppTheme.color.textMuted },
              ]}
            >
              {value}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.statusButtonValue,
          { color: value === 'ON' ? AppTheme.color.primaryDark : borderColor },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusButton: {
    width: '48.5%',
    borderRadius: AppTheme.radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: AppTheme.color.line,
    marginBottom: 12,
    backgroundColor: AppTheme.color.surface,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusButtonLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: AppTheme.color.textMuted,
    marginRight: 8,
  },
  statusPill: {
    minHeight: 24,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusButtonValue: {
    fontSize: 21,
    color: AppTheme.color.text,
    fontWeight: '900',
    marginTop: 10,
  },
});
