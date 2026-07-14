import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
  keepLocalCopy,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import {Button, Menu, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {
  importStudentRoster,
  RosterImportResult,
  RosterImportRow,
} from '../../services/studentService';
import {ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<
  TeacherStackParamList,
  'ImportStudentRoster'
>;

type PreviewRow = RosterImportRow & {
  rowNumber: number;
  errors: string[];
};

const requiredHeaders = ['studentNumber', 'name'];

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_-]/g, '');

const parseRosterData = (base64String: string): PreviewRow[] => {
  const workbook = XLSX.read(base64String, {type: 'base64'});
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(sheet, {
    blankrows: false,
    defval: '',
    header: 1,
  }) as any[][];
  const lines = data.filter(row =>
    row.some(cell => String(cell).trim() !== ''),
  );
  
  if (lines.length < 2) {
    throw new Error('File must include a header row and at least one student.');
  }

  const rawHeaders = lines[0].map(h => String(h || ''));
  const headerMap = Object.fromEntries(
    rawHeaders.map((header, index) => [normalizeHeader(header), index]),
  );

  let nameIndex = headerMap.name;
  if (nameIndex === undefined) {
    nameIndex = headerMap.fullname;
  }
  
  if (headerMap.studentnumber === undefined) {
    throw new Error('File is missing required column: studentNumber.');
  }
  if (nameIndex === undefined) {
    throw new Error('File is missing required column: name (or fullName).');
  }

  const seen = new Set<string>();
  return lines.slice(1).map((row, index) => {
    const valueForIndex = (colIndex: number) => {
      const val = row[colIndex];
      return val !== undefined && val !== null ? String(val).trim() : '';
    };
    
    const studentNumber = valueForIndex(headerMap.studentnumber ?? -1);
    const fullName = valueForIndex(nameIndex ?? -1);

    const previewRow: PreviewRow = {
      rowNumber: index + 2,
      studentNumber,
      fullName,
      errors: [],
    };
    
    const duplicateKey = studentNumber.toLowerCase();

    if (!previewRow.studentNumber) {
      previewRow.errors.push('Student number is required.');
    }
    if (!previewRow.fullName) {
      previewRow.errors.push('Name is required.');
    }
    if (seen.has(duplicateKey) && previewRow.studentNumber) {
      previewRow.errors.push('Duplicate student number in this file.');
    }
    seen.add(duplicateKey);
    return previewRow;
  });
};

export const ImportStudentRosterScreen = ({route}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RosterImportResult | null>(null);

  const load = useCallback(async () => {
    if (profile) {
      setClasses(await getTeacherClasses(profile.uid));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClass = classes.find(item => item.id === classId);
  const validRows = useMemo(
    () => rows.filter(row => row.errors.length === 0),
    [rows],
  );
  const invalidRows = rows.length - validRows.length;
  const canImport = Boolean(classId && validRows.length);
  const disabledImportMessage = !classId
    ? 'Select a class before importing.'
    : !validRows.length
      ? 'Upload a roster with at least one valid student row.'
      : '';

  const pickFile = async () => {
    setPicking(true);
    setResult(null);
    setError('');
    try {
      const [file] = await pick({
        type: [types.csv, types.plainText, types.xls, types.xlsx],
        allowMultiSelection: false,
        mode: 'import',
      });
      const [localCopy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name || 'import-file' }],
        destination: 'cachesDirectory',
      });
      const uriToRead = localCopy.status === 'success' ? localCopy.localUri : file.uri;
      const fileBase64 = await RNFS.readFile(decodeURIComponent(uriToRead), 'base64');
      setRows(parseRosterData(fileBase64));
      setFileName(file.name || 'student-roster');
    } catch (pickError) {
      if (
        !isErrorWithCode(pickError) ||
        pickError.code !== errorCodes.OPERATION_CANCELED
      ) {
        setError(
          pickError instanceof Error
            ? pickError.message
            : 'Unable to read the selected file.',
        );
      }
    } finally {
      setPicking(false);
    }
  };

  const importRows = async () => {
    if (!classId) {
      setError('Select a class before importing students.');
      return;
    }
    if (!validRows.length) {
      setError('Select a file with at least one valid student row.');
      return;
    }
    setImporting(true);
    setError('');
    setResult(null);
    try {
      setResult(await importStudentRoster(classId, validRows));
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Unable to import student roster.',
      );
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading classes..." />;
  }

  const renderSectionHeader = (
    step: string,
    title: string,
    subtitle?: string,
  ) => (
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const renderClassSection = () => (
    <View style={styles.sectionBlock}>
      {renderSectionHeader(
        '1',
        'Choose Class',
        'Students will be linked to the selected class.',
      )}
      {classes.length ? (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(true)}
              style={({pressed}) => [
                styles.selectorCard,
                pressed && styles.pressed,
              ]}>
              <View style={styles.selectorIcon}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={24}
                  color="#2563EB"
                />
              </View>
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorLabel}>Selected class</Text>
                <Text numberOfLines={1} style={styles.selectorTitle}>
                  {selectedClass ? selectedClass.className : 'Select class'}
                </Text>
                <Text numberOfLines={1} style={styles.selectorMeta}>
                  {selectedClass
                    ? `${selectedClass.subject} · ${selectedClass.section}`
                    : 'Choose where this roster belongs'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color="#52617E"
              />
            </Pressable>
          }>
          {classes.map(item => (
            <Menu.Item
              key={item.id}
              title={`${item.className} · ${item.section}`}
              onPress={() => {
                setClassId(item.id);
                setMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      ) : (
        <EmptyState
          title="Create a class first"
          message="A class is required before importing a student roster."
        />
      )}
    </View>
  );

  const renderUploadSection = () => (
    <View style={styles.sectionBlock}>
      {renderSectionHeader(
        '2',
        'Upload Roster',
        'Accepted files: Excel, CSV, or plain text exports.',
      )}
      <AppCard style={styles.uploadCard}>
        <View style={styles.uploadIcon}>
          <MaterialCommunityIcons
            name="file-delimited-outline"
            size={28}
            color="#2563EB"
          />
        </View>
        <View style={styles.uploadCopy}>
          <Text style={styles.uploadTitle}>Required columns</Text>
          <Text style={styles.uploadText}>
            Use {requiredHeaders.join(', ')}. You can also use fullName instead
            of name.
          </Text>
        </View>
      </AppCard>
      {fileName ? (
        <View style={styles.fileCard}>
          <View style={styles.fileIcon}>
            <MaterialCommunityIcons
              name="file-check-outline"
              size={24}
              color="#16A34A"
            />
          </View>
          <View style={styles.fileCopy}>
            <Text numberOfLines={1} style={styles.fileName}>
              {fileName}
            </Text>
            <Text style={styles.fileMeta}>
              {rows.length} rows parsed from selected file
            </Text>
          </View>
          <Button
            mode="text"
            onPress={pickFile}
            disabled={picking || importing}
            labelStyle={styles.replaceButtonLabel}>
            Replace
          </Button>
        </View>
      ) : null}
      <AppButton
        icon={fileName ? 'file-replace-outline' : 'file-upload-outline'}
        loading={picking}
        disabled={picking || importing}
        onPress={pickFile}>
        {fileName ? 'Replace File' : 'Select Excel / CSV File'}
      </AppButton>
    </View>
  );

  const renderAlert = () =>
    error ? (
      <View style={styles.alertCard}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={22}
          color="#DC2626"
        />
        <Text style={styles.alertText}>{error}</Text>
      </View>
    ) : null;

  const renderStatCard = (
    label: string,
    value: number,
    icon: string,
    iconStyle: object,
    valueStyle: object,
    iconColor: string,
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, iconStyle]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.statValue, valueStyle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderStatsSection = () =>
    rows.length ? (
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total rows',
          rows.length,
          'table-row',
          styles.statIconTotal,
          styles.statValueTotal,
          '#2563EB',
        )}
        {renderStatCard(
          'Ready',
          validRows.length,
          'check-circle-outline',
          styles.statIconReady,
          styles.statValueReady,
          '#16A34A',
        )}
        {renderStatCard(
          'Needs review',
          invalidRows,
          'alert-circle-outline',
          styles.statIconIssue,
          styles.statValueIssue,
          '#DC2626',
        )}
      </View>
    ) : null;

  const renderPreviewSection = () => (
    <View style={styles.sectionBlock}>
      {renderSectionHeader(
        '3',
        'Review Rows',
        rows.length
          ? 'Only rows marked ready will be imported.'
          : 'Upload a roster to review students before importing.',
      )}
      {renderStatsSection()}
      {rows.length ? (
        <View style={styles.previewList}>
          {rows.map(row => {
            const isValid = row.errors.length === 0;
            return (
              <View
                key={`${row.rowNumber}-${row.studentNumber || row.fullName}`}
                style={[
                  styles.previewRow,
                  !isValid && styles.previewRowError,
                ]}>
                <View style={styles.previewMain}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {row.fullName || `Row ${row.rowNumber}`}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewMeta}>
                    {row.studentNumber || 'No student number'} · Row{' '}
                    {row.rowNumber}
                  </Text>
                  {isValid ? null : (
                    <Text style={styles.previewError}>
                      {row.errors.join(' ')}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.rowStatusBadge,
                    isValid ? styles.rowStatusReady : styles.rowStatusIssue,
                  ]}>
                  <Text
                    style={[
                      styles.rowStatusText,
                      isValid
                        ? styles.rowStatusReadyText
                        : styles.rowStatusIssueText,
                    ]}>
                    {isValid ? 'Ready' : 'Issue'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No roster selected"
          message="Select an Excel or CSV file to preview student rows before importing."
        />
      )}
    </View>
  );

  const renderResultSection = () =>
    result ? (
      <View style={styles.sectionBlock}>
        {renderSectionHeader('4', 'Import Result')}
        <View style={styles.resultCard}>
          <View style={styles.resultIcon}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={28}
              color="#16A34A"
            />
          </View>
          <View style={styles.resultCopy}>
            <Text style={styles.resultTitle}>Import complete</Text>
            <Text style={styles.resultText}>
              Created {result.created}, updated {result.updated}, skipped{' '}
              {result.skipped}.
            </Text>
            {result.errors.length ? (
              <Text style={styles.resultError}>{result.errors.join('\n')}</Text>
            ) : null}
          </View>
        </View>
      </View>
    ) : null;

  return (
    <Screen>
      <AppHeader
        title="Import Student Roster"
        subtitle="Upload an Excel or CSV roster and link students to a class."
      />
      {renderClassSection()}
      {classes.length ? renderUploadSection() : null}
      {renderAlert()}
      {classes.length ? renderPreviewSection() : null}
      {classes.length ? (
        <>
          <AppButton
            icon="account-multiple-plus-outline"
            loading={importing}
            disabled={!canImport || importing}
            onPress={importRows}>
            Import Valid Students
          </AppButton>
          {disabledImportMessage ? (
            <Text style={styles.disabledHint}>{disabledImportMessage}</Text>
          ) : null}
        </>
      ) : null}
      {renderResultSection()}
    </Screen>
  );
};

const styles = StyleSheet.create({
  alertCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  alertText: {
    color: '#B91C1C',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  disabledHint: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  fileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 12,
  },
  fileCopy: {
    flex: 1,
    minWidth: 0,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  fileMeta: {
    color: '#52617E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  fileName: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
  previewError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  previewList: {
    gap: 10,
  },
  previewMain: {
    flex: 1,
    minWidth: 0,
  },
  previewMeta: {
    color: '#3B4968',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  previewName: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '900',
  },
  previewRow: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  previewRowError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  replaceButtonLabel: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  resultCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  resultCopy: {
    flex: 1,
  },
  resultError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  resultText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
  resultTitle: {
    color: '#14532D',
    fontSize: 16,
    fontWeight: '900',
  },
  rowStatusBadge: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rowStatusIssue: {
    backgroundColor: '#FEE2E2',
  },
  rowStatusIssueText: {
    color: '#B91C1C',
  },
  rowStatusReady: {
    backgroundColor: '#DCFCE7',
  },
  rowStatusReadyText: {
    color: '#166534',
  },
  rowStatusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
  selectorCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectorLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectorMeta: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  selectorTitle: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: 12,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    marginBottom: 8,
    width: 34,
  },
  statIconIssue: {
    backgroundColor: '#FEE2E2',
  },
  statIconReady: {
    backgroundColor: '#DCFCE7',
  },
  statIconTotal: {
    backgroundColor: '#E8F1FF',
  },
  statLabel: {
    color: '#52617E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  statValue: {
    fontSize: 23,
    fontWeight: '900',
  },
  statValueIssue: {
    color: '#DC2626',
  },
  statValueReady: {
    color: '#16A34A',
  },
  statValueTotal: {
    color: '#2563EB',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  uploadCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadCopy: {
    flex: 1,
    minWidth: 0,
  },
  uploadIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  uploadText: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  uploadTitle: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
});
