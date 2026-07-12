import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface DataCardProps {
  title: string;
  value: string;
  unit: string;
  iconName: keyof typeof Feather.glyphMap;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  unit,
  iconName,
  bgColor,
  iconColor,
  borderColor,
}) => (
  <GlassPanel style={styles.card} contentStyle={styles.cardContent} intensity={64} variant="strong">
    <View style={[styles.accentRail, { backgroundColor: borderColor }]} />
    <View style={styles.cardHeader}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardNormalLabel}>Pembacaan langsung</Text>
      </View>
      <View style={[styles.iconShell, { backgroundColor: bgColor, borderColor: `${borderColor}33` }]}>
        <Feather name={iconName} size={22} color={iconColor} />
      </View>
    </View>
    <View style={styles.cardValueContainer}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardUnit}>{unit}</Text>
    </View>
  </GlassPanel>
);

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 146,
    borderRadius: AppTheme.radius.card,
  },
  cardContent: {
    minHeight: 144,
    padding: 14,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardNormalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppTheme.color.textSubtle,
    marginTop: 3,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: AppTheme.color.text,
    fontWeight: '800',
  },
  cardValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  cardValue: {
    fontSize: 34,
    fontWeight: '900',
    color: AppTheme.color.text,
    letterSpacing: 0,
  },
  cardUnit: {
    fontSize: 17,
    fontWeight: '800',
    color: AppTheme.color.textMuted,
    marginLeft: 5,
    marginBottom: 3,
  },
});
