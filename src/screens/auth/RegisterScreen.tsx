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
import {useAuth} from '../../context/AuthContext';
import {AuthStackParamList} from '../../types/navigation';
import {isEmail} from '../../utils/validationUtils';

const classTrackLogo = require('../../assets/images/class-track-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({navigation, route}: Props) => {
  const {studentId, fullName, studentNumber} = route.params;
  const {height, width} = useWindowDimensions();
  const {registerStudent, loading, authError} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const isShortScreen = height < 740;
  const isNarrowScreen = width < 380;
  const logoSize = isShortScreen ? 96 : isNarrowScreen ? 116 : 136;

  const handleRegister = async () => {
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    try {
      await registerStudent(email, password, studentId, fullName, studentNumber);
      navigation.navigate('Login');
    } catch {
      // AuthContext exposes a readable registration error.
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
        <Text style={styles.title}>Register Email</Text>
        <Text style={styles.subtitle}>
          Create your account for {fullName}
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          icon="email-outline"
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Enter your email"
        />
        <Field
          icon="lock-outline"
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry={!passwordVisible}
          rightIcon={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
          onRightPress={() => setPasswordVisible(current => !current)}
        />
        <Field
          icon="lock-check-outline"
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry={!passwordVisible}
        />

        <HelperText
          type="error"
          visible={Boolean(error || authError)}
          style={styles.helperText}>
          {error || authError || ' '}
        </HelperText>

        <Button
          mode="contained"
          disabled={loading}
          onPress={handleRegister}
          buttonColor="#075FE4"
          textColor="#FFFFFF"
          contentStyle={styles.primaryButtonContent}
          labelStyle={styles.primaryButtonLabel}>
          {loading ? 'Creating account...' : 'Register'}
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
  rightIcon?: string;
  onRightPress?: () => void;
};

const Field = ({
  icon,
  label,
  rightIcon,
  onRightPress,
  ...inputProps
}: FieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrap}>
      <MaterialCommunityIcons name={icon} size={24} color="#747A8A" />
      <RNTextInput
        {...inputProps}
        placeholderTextColor="#7B8191"
        style={styles.input}
      />
      {rightIcon ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRightPress}
          hitSlop={10}
          style={styles.eyeButton}>
          <MaterialCommunityIcons name={rightIcon} size={24} color="#747A8A" />
        </Pressable>
      ) : null}
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
  eyeButton: {
    padding: 2,
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
