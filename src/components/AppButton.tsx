import React from 'react';
import {StyleSheet, ActivityIndicator} from 'react-native';
import {Button, ButtonProps} from 'react-native-paper';

type Props = ButtonProps & {
  fullWidth?: boolean;
};

export const AppButton = ({
  children,
  mode = 'contained',
  fullWidth = true,
  style,
  icon,
  loading,
  ...props
}: Props) => {
  const textColor = mode === 'contained' ? '#FFFFFF' : '#2563EB';
  return (
    <Button
      mode={mode}
      buttonColor={mode === 'contained' ? '#2563EB' : undefined}
      textColor={textColor}
      compact={false}
      style={[styles.button, fullWidth && styles.fullWidth, style]}
      contentStyle={styles.content}
      labelStyle={styles.label}
      loading={false}
      icon={
        loading
          ? () => <ActivityIndicator color={textColor} size="small" />
          : icon
      }
      {...props}>
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderColor: '#DCE8FF',
    borderRadius: 14,
    marginTop: 8,
  },
  content: {
    minHeight: 54,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 15,
    fontWeight: '900',
  },
});
