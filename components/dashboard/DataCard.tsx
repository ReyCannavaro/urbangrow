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
      <Text style={[styles.cardNormalLabel, { borderColor, color: borderColor }]}>Ideal Range</Text>
      <Feather name={iconName} size={28} color={iconColor} style={styles.cardIcon} />
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
    borderRadius: 15,
    padding: 15,
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
    fontWeight: 'bold',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cardIcon: {
    alignSelf: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  cardValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 5,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 5,
    marginBottom: 3,
  },
});
