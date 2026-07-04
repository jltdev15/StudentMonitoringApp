import React, {PropsWithChildren} from 'react';
import {ScrollView, StyleProp, StyleSheet, ViewStyle} from 'react-native';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export const Screen = ({children, style}: Props) => (
  <ScrollView
    contentInsetAdjustmentBehavior="automatic"
    keyboardShouldPersistTaps="handled"
    style={styles.root}
    contentContainerStyle={[styles.content, style]}>
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  root: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
});
