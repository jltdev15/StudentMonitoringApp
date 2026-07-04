import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
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
import {Button, HelperText, Menu, Text} from 'react-native-paper';
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
  const workbook = XLSX.read(base64String, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const lines = data.filter(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== ''));
  
  if (lines.length < 2) {
    throw new Error('File must include a header row and at least one student.');
  }

  const rawHeaders = lines[0].map(h => String(h || ''));
  const headerMap = Object.fromEntries(
    rawHeaders.map((header, index) => [normalizeHeader(header), index]),
  );

  let nameIndex = headerMap['name'];
  if (nameIndex === undefined) {
    nameIndex = headerMap['fullname'];
  }
  
  if (headerMap['studentnumber'] === undefined) {
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
    
    const studentNumber = valueForIndex(headerMap['studentnumber'] ?? -1);
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

  return (
    <Screen>
      <AppHeader
        title="Import Student Roster"
        subtitle="Upload an Excel or CSV roster and link students to a class."
      />

      <Text style={styles.sectionTitle}>Class</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            icon="school-outline"
            onPress={() => setMenuVisible(true)}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}>
            {selectedClass ? selectedClass.className : 'Select class'}
          </Button>
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

      <AppCard style={styles.templateCard}>
        <View style={styles.templateIcon}>
          <MaterialCommunityIcons
            name="file-delimited-outline"
            size={26}
            color="#2563EB"
          />
        </View>
        <View style={styles.templateCopy}>
          <Text style={styles.templateTitle}>Columns</Text>
          <Text style={styles.templateText}>
            Required: {requiredHeaders.join(', ')}.
          </Text>
        </View>
      </AppCard>

      <AppButton
        icon="file-upload-outline"
        loading={picking}
        onPress={pickFile}>
        Select Excel / CSV File
      </AppButton>

      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>

      {fileName ? (
        <View style={styles.summaryCard}>
          <Text numberOfLines={1} style={styles.fileName}>
            {fileName}
          </Text>
          <Text style={styles.summaryText}>
            {validRows.length} valid · {invalidRows} invalid
          </Text>
        </View>
      ) : null}

      {rows.length ? (
        <>
          <Text style={styles.sectionTitle}>Preview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.previewList}>
              {rows.slice(0, 25).map(row => (
                <View
                  key={`${row.rowNumber}-${row.studentNumber}`}
                  style={[
                    styles.previewRow,
                    row.errors.length ? styles.previewRowError : null,
                  ]}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {row.fullName || `Row ${row.rowNumber}`}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewMeta}>
                    {row.studentNumber || 'No student number'}
                  </Text>
                  {row.errors.length ? (
                    <Text style={styles.previewError}>
                      {row.errors.join(' ')}
                    </Text>
                  ) : (
                    <Text style={styles.previewOk}>Ready to import</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
          <AppButton
            icon="account-multiple-plus-outline"
            loading={importing}
            disabled={!validRows.length || !classId}
            onPress={importRows}>
            Import Valid Students
          </AppButton>
        </>
      ) : (
        <EmptyState
          title="No roster selected"
          message="Select an Excel or CSV file to preview student rows before importing."
        />
      )}

      {result ? (
        <AppCard style={styles.resultCard}>
          <Text style={styles.resultTitle}>Import complete</Text>
          <Text style={styles.resultText}>
            Created {result.created}, updated {result.updated}, skipped{' '}
            {result.skipped}.
          </Text>
          {result.errors.length ? (
            <Text style={styles.resultError}>{result.errors.join('\n')}</Text>
          ) : null}
        </AppCard>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  fileName: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
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
    paddingBottom: 14,
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
  previewOk: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  previewRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 104,
    padding: 12,
    width: 260,
  },
  previewRowError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  resultCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  resultError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  resultText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  resultTitle: {
    color: '#14532D',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 8,
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    marginBottom: 16,
  },
  selectButtonContent: {
    minHeight: 50,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  summaryText: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  templateCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  templateCopy: {
    flex: 1,
    minWidth: 0,
  },
  templateIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  templateText: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  templateTitle: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
});
