import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../../context/AuthContext';
import {TeacherStackParamList} from '../../types/navigation';
import {colors} from '../../utils/constants';

type Props = NativeStackScreenProps<TeacherStackParamList, 'Settings'>;

const accountRows = [
  {label: 'Account type', icon: 'shield-account-outline', value: 'Teacher'},
  {label: 'Class access', icon: 'google-classroom', value: 'Active classes'},
  {label: 'Session', icon: 'cellphone-key', value: 'Signed in'},
] as const;

export const SettingsScreen = ({navigation}: Props) => {
  const {profile, signOut, loading} = useAuth();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const isCompact = width < 420;

  const initials = (profile?.fullName || 'Teacher')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: Math.max(insets.bottom, 18) + 28},
        ]}>
        <View style={[styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.heroGlow} />
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              style={({pressed}) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={isCompact ? 32 : 36}
                color="#FFFFFF"
              />
            </Pressable>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="cog-outline"
                size={isCompact ? 28 : 32}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={[styles.eyebrow, isCompact && styles.eyebrowCompact]}>
            Account settings
          </Text>
          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Manage your profile
          </Text>
          <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
            Review your teacher account details and session controls.
          </Text>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.profileCard,
              isCompact && styles.profileCardCompact,
            ]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'T'}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>
                {profile?.fullName || 'Teacher'}
              </Text>
              <Text numberOfLines={1} style={styles.profileEmail}>
                {profile?.email || 'No email available'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.listCard}>
            {accountRows.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.infoRow,
                  index < accountRows.length - 1 && styles.rowDivider,
                ]}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={26}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowSubtitle}>
                    {item.label === 'Account type'
                      ? profile?.role || item.value
                      : item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Session</Text>
          <View style={styles.listCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              disabled={loading}
              onPress={signOut}
              style={({pressed}) => [
                styles.logoutRow,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}>
              <View style={[styles.rowIcon, styles.logoutIcon]}>
                {loading ? (
                  <ActivityIndicator size={24} color={colors.danger} />
                ) : (
                  <MaterialCommunityIcons
                    name="logout"
                    size={26}
                    color={colors.danger}
                  />
                )}
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.logoutTitle}>
                  {loading ? 'Logging out...' : 'Log out'}
                </Text>
                <Text style={styles.rowSubtitle}>
                  End this teacher session on this device.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={30}
                color="#52617E"
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  body: {
    paddingHorizontal: 18,
  },
  content: {
    backgroundColor: '#F6F9FE',
  },
  disabled: {
    opacity: 0.62,
  },
  eyebrow: {
    color: '#E7EEFD',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 38,
  },
  eyebrowCompact: {
    fontSize: 18,
    marginTop: 30,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  hero: {
    backgroundColor: '#062A66',
    minHeight: 278,
    overflow: 'hidden',
    paddingBottom: 72,
    paddingHorizontal: 38,
    paddingTop: 42,
  },
  heroCompact: {
    minHeight: 250,
    paddingBottom: 64,
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  heroGlow: {
    backgroundColor: '#0C3D87',
    borderRadius: 160,
    height: 320,
    opacity: 0.22,
    position: 'absolute',
    right: -110,
    top: -80,
    width: 320,
  },
  iconButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 84,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    overflow: 'hidden',
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  logoutIcon: {
    backgroundColor: '#FFF1F2',
  },
  logoutRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 92,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 18,
    marginTop: -48,
    padding: 22,
    shadowColor: '#7685A3',
    shadowOffset: {height: 10, width: 0},
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  profileCardCompact: {
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileEmail: {
    color: '#3B4968',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  profileName: {
    color: '#081638',
    fontSize: 24,
    fontWeight: '900',
  },
  root: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowDivider: {
    borderBottomColor: '#E8EDF5',
    borderBottomWidth: 1,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  rowSubtitle: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  rowTitle: {
    color: '#081638',
    fontSize: 17,
    fontWeight: '900',
  },
  scroll: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 16,
    marginTop: 34,
  },
  subtitle: {
    color: '#E7EEFD',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 12,
    maxWidth: 560,
  },
  subtitleCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 10,
  },
  titleCompact: {
    fontSize: 32,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
