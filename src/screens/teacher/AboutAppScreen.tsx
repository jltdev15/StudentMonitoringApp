import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';

export const AboutAppScreen = () => (
  <Screen>
    <AppHeader
      title="About App"
      subtitle="Classroom management, made simpler."
    />
    <AppCard style={styles.appCard}>
      <View style={styles.appHeader}>
        <View style={styles.appIcon}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={30}
            color="#2563EB"
          />
        </View>
        <View style={styles.appCopy}>
          <Text style={styles.eyebrow}>CLASSROOM WORKSPACE</Text>
          <Text style={styles.title}>Class Tracker</Text>
        </View>
      </View>
      <Text style={styles.body}>
        A focused workspace for managing classes, attendance, activities,
        scores, announcements, and reports.
      </Text>
      <View style={styles.featureList}>
        <Feature icon="account-group-outline" label="Keep every class organized" />
        <Feature icon="calendar-check-outline" label="Track attendance with confidence" />
        <Feature icon="clipboard-check-outline" label="Manage activities and scores" />
      </View>
    </AppCard>
    <Text style={styles.sectionLabel}>CREATED BY</Text>
    <AppCard style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.profileIcon}>
          <MaterialCommunityIcons
            name="account-tie-outline"
            size={28}
            color="#2563EB"
          />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>John Lerry Taruc</Text>
          <Text style={styles.profileRole}>Founder & Developer</Text>
        </View>
      </View>
      <View style={styles.companyRow}>
        <MaterialCommunityIcons name="office-building-outline" size={20} color="#52617E" />
        <Text style={styles.companyName}>StrataCloud</Text>
      </View>
    </AppCard>
    <View style={styles.footer}>
      <MaterialCommunityIcons name="code-tags" size={17} color="#64748B" />
      <Text style={styles.footerText}>Built by StrataCloud</Text>
    </View>
  </Screen>
);

type FeatureProps = {
  icon: string;
  label: string;
};

const Feature = ({icon, label}: FeatureProps) => (
  <View style={styles.featureRow}>
    <View style={styles.featureIcon}>
      <MaterialCommunityIcons name={icon} size={18} color="#2563EB" />
    </View>
    <Text style={styles.featureText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  appCard: {
    padding: 20,
  },
  appCopy: {
    flex: 1,
    minWidth: 0,
  },
  appHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  appIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  body: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 18,
  },
  companyName: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '800',
  },
  companyRow: {
    alignItems: 'center',
    borderTopColor: '#E8EEF8',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingTop: 16,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  featureList: {
    gap: 12,
    marginTop: 20,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureText: {
    color: '#31405F',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  profileCard: {
    padding: 20,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  profileName: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
  profileRole: {
    color: '#52617E',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 4,
  },
  title: {
    color: '#081638',
    fontSize: 20,
    fontWeight: '900',
  },
});
