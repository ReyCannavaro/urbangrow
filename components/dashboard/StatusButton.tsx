import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatusButtonProps {
  label: string;
  value: string;
  borderColor: string;
}

export const StatusButton: React.FC<StatusButtonProps> = ({ label, value, borderColor }) => (
  <View style={[styles.statusButton, { borderColor }]}>
    <Text style={[styles.statusButtonLabel, { color: borderColor }]}>{label}</Text>
    <Text style={styles.statusButtonValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  statusButton: {
    width: '48.5%',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  statusButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusButtonValue: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 5,
  },
});
