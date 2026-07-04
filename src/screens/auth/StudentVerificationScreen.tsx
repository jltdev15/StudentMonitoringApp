import React, {useState} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, HelperText, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Screen} from '../../components/Screen';
import {AuthStackParamList} from '../../types/navigation';
import {findRosterStudent} from '../../services/studentService';

const classTrackLogo = require('../../assets/images/class-track-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'StudentVerification'>;

export const StudentVerificationScreen = ({navigation}: Props) => {
  const {height, width} = useWindowDimensions();
  const [studentNumber, setStudentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isShortScreen = height < 740;
  const isNarrowScreen = width < 380;
  const logoSize = isShortScreen ? 96 : isNarrowScreen ? 116 : 136;

  const handleVerify = async () => {
    if (!studentNumber.trim()) {
      setError('Student number is required.');
      return;
    }
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const rosterStudent = await findRosterStudent(studentNumber);
      
      if (!rosterStudent) {
        throw new Error('We could not find an unclaimed student record with that number.');
      }
      
      if (rosterStudent.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
        throw new Error('The full name provided does not match our records.');
      }
      
      navigation.navigate('Register', {
        studentId: rosterStudent.id,
        fullName: rosterStudent.fullName,
        studentNumber: rosterStudent.studentNumber,
      });
      
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Verification failed. Please check your details.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      style={[
        styles.content,
        isShortScreen && styles.contentShort,
        isNarrowScreen && styles.contentNarrow,
      ]}>
      <View style={styles.heroGlow} />
      <View style={styles.brand}>
        <Image
          source={classTrackLogo}
          resizeMode="contain"
          style={[styles.logo, {height: logoSize, width: logoSize}]}
        />
        <Text style={styles.title}>Student Verification</Text>
        <Text style={styles.subtitle}>
          Verify your student number and name before registering.
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          icon="identifier"
          label="Student Number"
          value={studentNumber}
          onChangeText={setStudentNumber}
          autoCapitalize="characters"
          placeholder="Enter your student number"
        />
        <Field
          icon="account-outline"
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          placeholder="Enter your full name"
        />

        <HelperText
          type="error"
          visible={Boolean(error)}
          style={styles.helperText}>
          {error || ' '}
        </HelperText>

        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={handleVerify}
          buttonColor="#075FE4"
          textColor="#FFFFFF"
          contentStyle={styles.primaryButtonContent}
          labelStyle={styles.primaryButtonLabel}>
          Verify Identity
        </Button>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}>
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

type FieldProps = React.ComponentProps<typeof RNTextInput> & {
  icon: string;
  label: string;
};

const Field = ({icon, label, ...inputProps}: FieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name={icon} size={24} color="#747A8A" />
      <RNTextInput
        {...inputProps}
        placeholderTextColor="#7B8191"
        style={styles.input}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentNarrow: {
    paddingHorizontal: 18,
  },
  contentShort: {
    justifyContent: 'flex-start',
  },
  field: {
    marginBottom: 12,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    padding: 18,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 4,
  },
  heroGlow: {
    backgroundColor: '#E8F1FF',
    borderRadius: 180,
    height: 360,
    opacity: 0.9,
    position: 'absolute',
    right: -170,
    top: -150,
    width: 360,
  },
  input: {
    color: '#081638',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 52,
    padding: 0,
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE8F8',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
  },
  label: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 7,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  loginText: {
    color: '#075FE4',
    fontSize: 14,
    fontWeight: '900',
  },
  logo: {
    marginBottom: 8,
  },
  primaryButtonContent: {
    minHeight: 56,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    color: '#52617E',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
    textAlign: 'center',
  },
  title: {
    color: '#081638',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
});
