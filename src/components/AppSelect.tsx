import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {Menu, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  label: string;
  options: string[];
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
};

export const AppSelect = ({
  label,
  options,
  placeholder,
  value,
  onSelect,
  style,
}: Props) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => setVisible(true)}
            style={({pressed}) => [
              styles.input,
              pressed && styles.pressed,
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.value, !value && styles.placeholder]}>
              {value || placeholder}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={22}
              color="#3B4968"
            />
          </Pressable>
        }>
        {options.map(option => (
          <Menu.Item
            key={option}
            title={option}
            onPress={() => {
              onSelect(option);
              setVisible(false);
            }}
          />
        ))}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  placeholder: {
    color: '#8A94A8',
  },
  pressed: {
    opacity: 0.78,
  },
  value: {
    color: '#081638',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
});
