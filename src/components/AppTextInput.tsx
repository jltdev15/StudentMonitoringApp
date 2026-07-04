import React from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {Text} from 'react-native-paper';

type Props = TextInputProps & {
  label?: string;
  style?: ViewStyle;
};

export const AppTextInput = ({label, style, ...props}: Props) => (
  <View style={[styles.container, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor="#8A94A8"
      style={styles.input}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    color: '#081638',
    elevation: 1,
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  label: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
});
