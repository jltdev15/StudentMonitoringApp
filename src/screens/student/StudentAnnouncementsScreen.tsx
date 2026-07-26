import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getAnnouncementsForStudent} from '../../services/announcementService';
import {AnnouncementRecord} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type AnnouncementCategory = 'general' | 'academic' | 'events';
type AnnouncementFilter = 'all' | AnnouncementCategory;
type Props = Pick<
  NativeStackScreenProps<StudentStackParamList, 'StudentAnnouncements'>,
  'navigation'
>;

type CategoryMeta = {
  chip: string;
  color: string;
  icon: string;
  iconBackground: string;
  label: string;
};

const categoryMeta: Record<AnnouncementCategory, CategoryMeta> = {
  general: {
    chip: '#F1E8FF',
    color: '#7B3FF2',
    icon: 'bullhorn-outline',
    iconBackground: '#F4EDFF',
    label: 'General',
  },
  academic: {
    chip: '#E6F0FF',
    color: '#2166D8',
    icon: 'book-open-page-variant-outline',
    iconBackground: '#EAF2FF',
    label: 'Academic',
  },
  events: {
    chip: '#E5F9ED',
    color: '#129B4A',
    icon: 'calendar-star-outline',
    iconBackground: '#EAF9F0',
    label: 'Events',
  },
};

const filters: Array<{
  icon: string;
  label: string;
  value: AnnouncementFilter;
}> = [
  {icon: 'view-grid-outline', label: 'All', value: 'all'},
  {icon: 'bullhorn-outline', label: 'General', value: 'general'},
  {icon: 'book-open-page-variant-outline', label: 'Academic', value: 'academic'},
  {icon: 'calendar-check-outline', label: 'Events', value: 'events'},
];

const eventTerms =
  /\b(event|celebration|fair|registration|festival|program|ceremony|holiday|foundation|competition|contest)\b/i;
const academicTerms =
  /\b(academic|schoolwork|worksheet|assignment|quiz|exam|grade|subject|class|lesson|course|study|curriculum)\b/i;

export const getAnnouncementCategory = (
  announcement: Pick<
    AnnouncementRecord,
    'announcementType' | 'message' | 'title'
  >,
): AnnouncementCategory => {
  if (announcement.announcementType) {
    return announcement.announcementType.toLowerCase() as AnnouncementCategory;
  }
  const source = `${announcement.title || ''} ${announcement.message || ''}`;

  if (eventTerms.test(source)) {
    return 'events';
  }

  if (academicTerms.test(source)) {
    return 'academic';
  }

  return 'general';
};

const FilterBar = ({
  activeFilter,
  onChange,
}: {
  activeFilter: AnnouncementFilter;
  onChange: (filter: AnnouncementFilter) => void;
}) => (
  <View accessibilityRole="tablist" style={styles.filterBar}>
    {filters.map(filter => {
      const active = activeFilter === filter.value;
      return (
        <Pressable
          accessibilityLabel={`Show ${filter.label}`}
          accessibilityRole="tab"
          accessibilityState={{selected: active}}
          key={filter.value}
          onPress={() => onChange(filter.value)}
          style={({pressed}) => [
            styles.filter,
            active && styles.filterActive,
            pressed && styles.filterPressed,
          ]}>
          <MaterialCommunityIcons
            color={active ? '#FFFFFF' : '#526483'}
            name={filter.icon}
            size={16}
          />
          <Text numberOfLines={1} style={[styles.filterLabel, active && styles.filterLabelActive]}>
            {filter.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const FeaturedAnnouncement = ({announcement}: {announcement: AnnouncementRecord}) => {
  const category = getAnnouncementCategory(announcement);
  const meta = categoryMeta[category];

  return (
    <View
      accessibilityLabel="Featured announcement"
      style={styles.featuredCard}
      testID="featured-announcement">
      <View style={styles.featuredGlowLarge} />
      <View style={styles.featuredGlowSmall} />
      <View style={styles.featuredCopy}>
        <View style={styles.featuredChip}>
          <MaterialCommunityIcons color="#FFFFFF" name="star" size={13} />
          <Text style={styles.featuredChipText}>FEATURED</Text>
        </View>
        <Text numberOfLines={2} style={styles.featuredTitle}>
          {announcement.title}
        </Text>
        <Text numberOfLines={3} style={styles.featuredMessage}>
          {announcement.message}
        </Text>
        <View style={styles.featuredDateRow}>
          <MaterialCommunityIcons color="#E7F0FF" name="calendar-blank-outline" size={16} />
          <Text style={styles.featuredDate}>Posted {toReadableDate(announcement.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.featuredArtwork}>
        <View style={styles.featuredArtworkRing}>
          <MaterialCommunityIcons color="#FFD76C" name={meta.icon} size={52} />
        </View>
        <View style={styles.featuredSparkOne} />
        <View style={styles.featuredSparkTwo} />
      </View>
    </View>
  );
};

const AnnouncementRow = ({
  announcement,
  onPress,
}: {
  announcement: AnnouncementRecord;
  onPress: () => void;
}) => {
  const category = getAnnouncementCategory(announcement);
  const meta = categoryMeta[category];

  return (
    <Pressable
      accessibilityLabel={`${meta.label}: ${announcement.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
      testID={`announcement-row-${announcement.id}`}>
      <View style={styles.rowCopy}>
        <View style={[styles.categoryChip, {backgroundColor: meta.chip}]}>
          <Text style={[styles.categoryLabel, {color: meta.color}]}>{meta.label}</Text>
        </View>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {announcement.title}
        </Text>
        <Text numberOfLines={2} style={styles.rowMessage}>
          {announcement.message}
        </Text>
        <View style={styles.rowDate}>
          <MaterialCommunityIcons color="#697B9E" name="calendar-blank-outline" size={13} />
          <Text numberOfLines={1} style={styles.rowDateText}>
            Posted {toReadableDate(announcement.createdAt)}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons color="#53688D" name="chevron-right" size={26} />
    </Pressable>
  );
};

const AnnouncementsPlaceholder = ({filter}: {filter: AnnouncementFilter}) => {
  const isAll = filter === 'all';
  const label = isAll ? 'No announcements yet' : `No ${filters.find(item => item.value === filter)?.label.toLowerCase()} yet`;

  return (
    <View style={styles.placeholder} testID="announcements-placeholder">
      <View style={styles.placeholderIcon}>
        <MaterialCommunityIcons color="#286BE8" name="bullhorn-outline" size={45} />
        <View style={styles.placeholderDot} />
      </View>
      <Text style={styles.placeholderTitle}>{label}</Text>
      <Text style={styles.placeholderMessage}>
        {isAll
          ? 'School and class updates will appear here when they are posted.'
          : 'Try another category to view available updates.'}
      </Text>
    </View>
  );
};

export const StudentAnnouncementsScreen = ({navigation}: Props) => {
  const {profile, student} = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const classIds = profile?.classIds?.length
      ? profile.classIds
      : student?.classIds || [];
    setLoading(true);
    setError('');
    try {
      setAnnouncements(await getAnnouncementsForStudent(classIds));
    } catch {
      setError('We could not load announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, student]);

  useEffect(() => {
    load();
  }, [load]);

  const featured =
    activeFilter === 'all'
      ? announcements.find(announcement => announcement.featured === true)
      : undefined;
  const visibleAnnouncements = useMemo(
    () =>
      announcements.filter(announcement => {
        if (activeFilter === 'all' && announcement.id === featured?.id) {
          return false;
        }
        return activeFilter === 'all' || getAnnouncementCategory(announcement) === activeFilter;
      }),
    [activeFilter, announcements, featured?.id],
  );

  if (loading) {
    return <LoadingState label="Loading announcements..." />;
  }

  if (error) {
    return (
      <Screen style={styles.screenContent}>
        <AppHeader
          title="Announcements"
          subtitle="Class and school updates."
          showBack={false}
        />
        <EmptyState
          title="Unable to load announcements"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screenContent}>
      <AppHeader
        title="Announcements"
        subtitle="Class and school updates."
        showBack={false}
      />
      <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
      {featured ? <FeaturedAnnouncement announcement={featured} /> : null}
      {visibleAnnouncements.length ? (
        <View style={styles.listCard}>
          {visibleAnnouncements.map((announcement, index) => (
            <View key={announcement.id}>
              {index ? <View style={styles.rowDivider} /> : null}
              <AnnouncementRow
                announcement={announcement}
                onPress={() =>
                  navigation.navigate('StudentAnnouncementDetails', {
                    announcement,
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : !featured ? (
        <AnnouncementsPlaceholder filter={activeFilter} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    marginBottom: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  categoryLabel: {fontSize: 11, fontWeight: '800'},
  featuredArtwork: {
    alignItems: 'center',
    bottom: 12,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
  },
  featuredArtworkRing: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,215,108,0.78)',
    borderRadius: 47,
    borderWidth: 2,
    height: 94,
    justifyContent: 'center',
    width: 94,
  },
  featuredCard: {
    backgroundColor: '#092F82',
    borderRadius: 16,
    elevation: 6,
    marginTop: 16,
    minHeight: 210,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#102F72',
    shadowOffset: {height: 7, width: 0},
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  featuredChip: {
    alignItems: 'center',
    backgroundColor: '#1557CC',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  featuredChipText: {color: '#FFFFFF', fontSize: 10, fontWeight: '900'},
  featuredCopy: {maxWidth: '66%'},
  featuredDate: {color: '#E7F0FF', flex: 1, fontSize: 11, fontWeight: '700'},
  featuredDateRow: {alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 14},
  featuredGlowLarge: {
    backgroundColor: 'rgba(42,104,224,0.55)',
    borderRadius: 120,
    height: 240,
    position: 'absolute',
    right: -90,
    top: -85,
    width: 240,
  },
  featuredGlowSmall: {
    backgroundColor: 'rgba(22,79,185,0.6)',
    borderRadius: 90,
    bottom: -80,
    height: 180,
    left: -90,
    position: 'absolute',
    width: 180,
  },
  featuredMessage: {color: '#E2ECFF', fontSize: 13, lineHeight: 18, marginTop: 8},
  featuredSparkOne: {backgroundColor: '#FFD76C', borderRadius: 3, height: 6, position: 'absolute', right: 1, top: 4, transform: [{rotate: '45deg'}], width: 6},
  featuredSparkTwo: {backgroundColor: '#5E9CFF', borderRadius: 3, height: 6, left: 4, position: 'absolute', top: 28, transform: [{rotate: '45deg'}], width: 6},
  featuredTitle: {color: '#FFFFFF', fontSize: 23, fontWeight: '900', letterSpacing: -0.35, lineHeight: 27, marginTop: 12},
  filter: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  filterActive: {backgroundColor: '#165FF1', elevation: 4, shadowColor: '#246BF0', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.22, shadowRadius: 7},
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5ECF7',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
    shadowColor: '#7183A1',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  filterLabel: {color: '#526483', fontSize: 9, fontWeight: '800'},
  filterLabelActive: {color: '#FFFFFF'},
  filterPressed: {opacity: 0.76},
  listCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6EDF8',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 3,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#6B7D9C',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5ECF7',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 30,
    paddingVertical: 42,
  },
  placeholderDot: {backgroundColor: '#42C779', borderColor: '#FFFFFF', borderRadius: 10, borderWidth: 3, bottom: -1, height: 19, position: 'absolute', right: -2, width: 19},
  placeholderIcon: {alignItems: 'center', backgroundColor: '#EAF2FF', borderRadius: 42, height: 84, justifyContent: 'center', position: 'relative', width: 84},
  placeholderMessage: {color: '#71809B', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center'},
  placeholderTitle: {color: '#122959', fontSize: 19, fontWeight: '900', marginTop: 18, textAlign: 'center'},
  row: {alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 13},
  rowCopy: {flex: 1, minWidth: 0},
  rowDate: {alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 6},
  rowDateText: {color: '#697B9E', flex: 1, fontSize: 11, fontWeight: '700'},
  rowDivider: {backgroundColor: '#E8EDF5', height: 1, marginHorizontal: 16},
  rowMessage: {color: '#627493', fontSize: 12, lineHeight: 16},
  rowTitle: {color: '#132758', fontSize: 15, fontWeight: '900', marginBottom: 2},
  screenContent: {paddingBottom: 30, paddingTop: 12},
});
