import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<
  StudentStackParamList,
  'StudentAnnouncementDetails'
>;

export const StudentAnnouncementDetailsScreen = ({route}: Props) => {
  const {announcement} = route.params;

  return (
    <Screen>
      <AppHeader title="Announcement" subtitle="Class and school update" />
      <AppCard style={styles.card}>
        <View style={styles.iconTile}>
          <MaterialCommunityIcons
            color="#2563EB"
            name="bullhorn-outline"
            size={29}
          />
        </View>
        <Text style={styles.eyebrow}>ANNOUNCEMENT</Text>
        <Text style={styles.title}>{announcement.title}</Text>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons
            color="#657797"
            name="calendar-blank-outline"
            size={16}
          />
          <Text style={styles.date}>
            Posted {toReadableDate(announcement.createdAt)}
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.message}>{announcement.message}</Text>
      </AppCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {padding: 22},
  date: {color: '#657797', fontSize: 13, fontWeight: '700'},
  dateRow: {alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 12},
  divider: {backgroundColor: '#E5ECF6', height: 1, marginVertical: 20},
  eyebrow: {color: '#2563EB', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, marginTop: 16},
  iconTile: {alignItems: 'center', backgroundColor: '#EAF2FF', borderRadius: 14, height: 54, justifyContent: 'center', width: 54},
  message: {color: '#314665', fontSize: 16, lineHeight: 25},
  title: {color: '#11285B', fontSize: 24, fontWeight: '900', letterSpacing: -0.35, lineHeight: 30, marginTop: 7},
});
