import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ClassRecord} from '../types/models';
import {colors} from '../utils/constants';
import {EmptyState} from './EmptyState';

type Props = {
  classes: ClassRecord[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  onClearClass?: () => void;
  emptyMessage?: string;
};

export const AttendanceClassSelector = ({
  classes,
  selectedClassId,
  onSelectClass,
  onClearClass,
  emptyMessage = 'Create a class before taking attendance.',
}: Props) => {
  const [showPicker, setShowPicker] = useState(!selectedClassId);
  const selectedClass = classes.find(item => item.id === selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setShowPicker(true);
    }
  }, [selectedClassId]);

  const selectClass = (classId: string) => {
    onSelectClass(classId);
    setShowPicker(false);
  };

  const changeClass = () => {
    onClearClass?.();
    setShowPicker(true);
  };

  if (!classes.length) {
    return <EmptyState title="No classes" message={emptyMessage} />;
  }

  return (
    <>
      {selectedClass && !showPicker ? (
        <View style={styles.selectedClassCard}>
          <View style={styles.selectedClassIcon}>
            <MaterialCommunityIcons
              name="google-classroom"
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.classCopy}>
            <Text numberOfLines={1} style={styles.className}>
              {selectedClass.className}
            </Text>
            <Text numberOfLines={1} style={styles.classMeta}>
              {[
                selectedClass.subject,
                selectedClass.gradeLevel,
                selectedClass.section,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={changeClass}
            style={({pressed}) => [
              styles.changeClassButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.changeClassText}>Change Class</Text>
          </Pressable>
        </View>
      ) : null}
      {showPicker ? (
        <>
          <Text style={styles.sectionTitle}>Select Class</Text>
          <View style={styles.classList}>
            {classes.map(item => {
              const selected = item.id === selectedClassId;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => selectClass(item.id)}
                  style={({pressed}) => [
                    styles.classCard,
                    selected && styles.classCardSelected,
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.classIcon,
                      selected && styles.classIconSelected,
                    ]}>
                    <MaterialCommunityIcons
                      name={selected ? 'check' : 'google-classroom'}
                      size={24}
                      color={selected ? '#FFFFFF' : colors.primary}
                    />
                  </View>
                  <View style={styles.classCopy}>
                    <Text numberOfLines={1} style={styles.className}>
                      {item.className}
                    </Text>
                    <Text numberOfLines={1} style={styles.classMeta}>
                      {[item.subject, item.gradeLevel, item.section]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  changeClassButton: {
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  changeClassText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  classCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    minHeight: 74,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  classCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  classCopy: {
    flex: 1,
    minWidth: 0,
  },
  classIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  classIconSelected: {
    backgroundColor: colors.primary,
  },
  classList: {
    gap: 12,
    marginBottom: 18,
  },
  classMeta: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  className: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  selectedClassCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FF',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    minHeight: 74,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  selectedClassIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
});
