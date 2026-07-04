import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  title: string;
  message?: string;
};

export const EmptyState = ({title, message}: Props) => (
  <View style={styles.container}>
    <View style={styles.artwork}>
      <View style={styles.artworkCircle} />
      <MaterialCommunityIcons
        name="clipboard-text-outline"
        size={68}
        color="#7FA7F2"
        style={styles.icon}
      />
      <MaterialCommunityIcons
        name="sprout-outline"
        size={28}
        color="#7FA7F2"
        style={styles.sprout}
      />
    </View>
    <Text style={styles.title}>{title}</Text>
    {message ? (
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 14,
    padding: 24,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  artwork: {
    alignItems: 'center',
    height: 104,
    justifyContent: 'center',
    width: 170,
  },
  artworkCircle: {
    backgroundColor: '#EEF5FF',
    borderRadius: 52,
    height: 104,
    position: 'absolute',
    width: 104,
  },
  icon: {
    zIndex: 2,
  },
  message: {
    color: '#6E7C99',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  sprout: {
    bottom: 10,
    position: 'absolute',
    right: 26,
  },
  title: {
    color: '#06143A',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
});
