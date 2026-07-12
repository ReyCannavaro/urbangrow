import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
    <View style={styles.cardHeader}>
      <Text style={[styles.cardNormalLabel, { borderColor, color: borderColor }]}>Zona Aman</Text>
      <View style={[styles.iconShell, { backgroundColor: '#ffffff99' }]}>
        <Feather name={iconName} size={22} color={iconColor} />
      </View>
    </View>
    <Text style={[styles.cardTitle, { color: iconColor }]}>{title}</Text>
    <View style={styles.cardValueContainer}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardUnit}>{unit}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 138,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardNormalLabel: {
    fontSize: 10,
    fontWeight: '800',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '700',
  },
  cardValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 5,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginLeft: 5,
    marginBottom: 3,
  },
});
