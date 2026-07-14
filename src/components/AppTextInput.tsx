import React from 'react';
import {
  StyleSheet,
  StyleProp,
  TextStyle,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {Text} from 'react-native-paper';

type Props = TextInputProps & {
  label?: string;
  style?: ViewStyle;
  inputStyle?: StyleProp<TextStyle>;
};

export const AppTextInput = ({label, style, inputStyle, ...props}: Props) => (
  <View style={[styles.container, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor="#8A94A8"
      style={[styles.input, inputStyle]}
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
    borderColor: '#DCE8FA',
    borderRadius: 18,
    borderWidth: 1,
    color: '#081638',
    elevation: 1,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  label: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
});
