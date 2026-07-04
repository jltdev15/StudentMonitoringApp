import {MD3LightTheme} from 'react-native-paper';
import {colors} from './constants';

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.danger,
    background: colors.background,
    surface: colors.surface,
    outline: colors.border,
  },
};
