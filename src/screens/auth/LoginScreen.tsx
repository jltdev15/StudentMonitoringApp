import React, {useEffect, useState} from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HelperText, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {AuthStackParamList} from '../../types/navigation';
import {isEmail} from '../../utils/validationUtils';

const classTrackLogo = require('../../assets/images/class-track-logo.png');
const loginBackground = require('../../assets/images/login-bg.webp');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type LoginFieldProps = {
  accessibilityLabel: string;
  icon: string;
  isPassword?: boolean;
  onChangeText: (value: string) => void;
  onTogglePassword?: () => void;
  passwordVisible?: boolean;
  placeholder: string;
  value: string;
};

const LoginField = ({
  accessibilityLabel,
  icon,
  isPassword = false,
  onChangeText,
  onTogglePassword,
  passwordVisible = false,
  placeholder,
  value,
}: LoginFieldProps) => (
  <View style={styles.field}>
    <MaterialCommunityIcons name={icon} size={27} color="#1460E8" />
    <View style={styles.fieldCopy}>
      <Text style={styles.fieldLabel}>{accessibilityLabel}</Text>
      <RNTextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={isPassword ? 'default' : 'email-address'}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A98B5"
        secureTextEntry={isPassword && !passwordVisible}
        style={styles.input}
        value={value}
      />
    </View>
    {isPassword ? (
      <Pressable
        accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        hitSlop={10}
        onPress={onTogglePassword}
        style={styles.eyeButton}>
        <MaterialCommunityIcons
          name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
          size={25}
          color="#7E8CA7"
        />
      </Pressable>
    ) : null}
  </View>
);

export const LoginScreen = ({navigation}: Props) => {
  const {height, width} = useWindowDimensions();
  const {signIn, resendVerification, loading, authError} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [verificationDismissed, setVerificationDismissed] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const isShortScreen = height < 740;
  const isNarrowScreen = width < 380;
  const contentMinHeight = Math.max(height - 32, 0);
  const sheetTopMargin = Math.max(48, Math.round(height * 0.59) - 310);
  const hasVerificationAuthError = Boolean(
    authError?.includes('verify your email'),
  );
  const showVerificationSection =
    (verificationRequired || hasVerificationAuthError) && !verificationDismissed;
  const formError = hasVerificationAuthError ? error : error || authError || '';

  useEffect(() => {
    if (hasVerificationAuthError) {
      setVerificationRequired(true);
      setVerificationDismissed(false);
    }
  }, [hasVerificationAuthError]);

  const handleLogin = async () => {
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setError('');
    setVerificationDismissed(false);
    setVerificationRequired(false);
    try {
      await signIn(email, password);
    } catch {
      // AuthContext exposes the readable Firebase error.
    }
  };

  const handleResend = async () => {
    if (!isEmail(email) || !password) {
      setError(
        'Please enter your email and password to resend the verification link.',
      );
      return;
    }
    setError('');
    try {
      await resendVerification(email, password);
      setError('Verification email resent. Please check your inbox.');
    } catch {
      setError('Could not resend the verification email. Please try again.');
    }
  };

  const screenStyle = [
    styles.content,
    isShortScreen && styles.contentShort,
    isNarrowScreen && styles.contentNarrow,
    {minHeight: contentMinHeight},
  ];

  if (showVerificationSection) {
    const resendSucceeded = error.includes('Verification email resent');
    return (
      <Screen style={[...screenStyle, styles.verificationContent]}>
        <ImageBackground
          imageStyle={styles.backgroundImageContent}
          resizeMode="cover"
          source={loginBackground}
          style={styles.backgroundImage}
        />
        <Brand short={isShortScreen} />
        <View
          style={[
            styles.sheet,
            styles.verificationSheet,
            {marginTop: sheetTopMargin},
          ]}>
          <View style={styles.verificationIcon}>
            <MaterialCommunityIcons
              name="email-check-outline"
              size={35}
              color="#1460E8"
            />
          </View>
          <Text style={styles.verificationTitle}>Verify your email</Text>
          <Text style={styles.verificationMessage}>
            Please verify your email address before logging in.
          </Text>
          {error ? (
            <Text
              style={[
                styles.verificationFeedback,
                resendSucceeded
                  ? styles.verificationSuccess
                  : styles.verificationError,
              ]}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Resend verification email"
            accessibilityRole="button"
            disabled={loading}
            onPress={handleResend}
            style={({pressed}) => [
              styles.loginButton,
              styles.verificationButton,
              (pressed || loading) && styles.pressed,
            ]}>
            <Text style={styles.loginButtonLabel}>
              {loading ? 'Sending email...' : 'Resend Verification Email'}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color="#FFFFFF"
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Use another account"
            accessibilityRole="button"
            onPress={() => {
              setError('');
              setVerificationDismissed(true);
              setVerificationRequired(false);
            }}
            style={styles.useAnotherAccountButton}>
            <Text style={styles.useAnotherAccountText}>Use another account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={screenStyle}>
      <ImageBackground
        imageStyle={styles.backgroundImageContent}
        resizeMode="cover"
        source={loginBackground}
        style={styles.backgroundImage}
      />

      <Brand short={isShortScreen} />

      <View
        style={[
          styles.sheet,
          isShortScreen && styles.sheetShort,
          {marginTop: sheetTopMargin},
        ]}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeIcon}>
            <MaterialCommunityIcons
              name="account-outline"
              size={38}
              color="#1460E8"
            />
          </View>
          <View style={styles.welcomeCopy}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>
              Login to continue to your account
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <LoginField
            accessibilityLabel="Email"
            icon="email-outline"
            onChangeText={setEmail}
            placeholder="Enter your email"
            value={email}
          />
          <View style={styles.passwordField}>
            <LoginField
              accessibilityLabel="Password"
              icon="lock-outline"
              isPassword
              onChangeText={setPassword}
              onTogglePassword={() => setPasswordVisible(current => !current)}
              passwordVisible={passwordVisible}
              placeholder="Enter your password"
              value={password}
            />
          </View>

          {formError ? (
            <HelperText type="error" style={styles.helperText}>
              {formError}
            </HelperText>
          ) : null}

          <Pressable accessibilityRole="button" style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Login"
            accessibilityRole="button"
            disabled={loading}
            onPress={handleLogin}
            style={({pressed}) => [
              styles.loginButton,
              (pressed || loading) && styles.pressed,
            ]}>
            <Text style={styles.loginButtonLabel}>
              {loading ? 'Signing in...' : 'Login'}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={29}
              color="#FFFFFF"
            />
          </Pressable>

          <View
            style={[
              styles.accountRow,
              isNarrowScreen && styles.accountRowNarrow,
            ]}>
            <Text style={styles.accountText}>Don&apos;t have an account?</Text>
            <Pressable
              accessibilityLabel="Register as student"
              accessibilityRole="button"
              onPress={() => navigation.navigate('StudentVerification')}>
              <Text style={styles.contactText}>Register as student</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
};

const Brand = ({short}: {short: boolean}) => (
  <View style={[styles.brand, short && styles.brandShort]}>
    <View style={styles.logoStage}>
      <View style={styles.logoGlowOuter} />
      <View style={styles.logoGlowInner} />
      <Text style={[styles.sparkle, styles.sparkleTop]}>✦</Text>
      <Text style={[styles.sparkle, styles.sparkleLeft]}>✦</Text>
      <Text style={[styles.sparkle, styles.sparkleRight]}>✦</Text>
      <Image
        resizeMode="contain"
        source={classTrackLogo}
        style={styles.brandLogo}
      />
    </View>
    <View style={styles.taglineRow}>
      <View style={styles.taglineLine} />
      <View style={styles.taglineDot} />
      <View style={styles.taglineLine} />
    </View>
    <Text style={styles.brandSubtitle}>Attendance. Activities. Progress.</Text>
  </View>
);

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    marginHorizontal: -20,
    marginTop: -20,
    overflow: 'hidden',
    padding: 0,
  },
  contentNarrow: {marginHorizontal: -20},
  contentShort: {paddingBottom: 18},
  backgroundImage: {bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  backgroundImageContent: {opacity: 1},
  brand: {alignItems: 'center', marginTop: 54},
  brandShort: {marginTop: 20},
  logoStage: {alignItems: 'center', height: 270, justifyContent: 'center', width: 270},
  logoGlowOuter: {
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 112,
    height: 224,
    position: 'absolute',
    width: 224,
  },
  logoGlowInner: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 83,
    height: 166,
    position: 'absolute',
    width: 166,
  },
  sparkle: {
    color: '#FFFFFF',
    fontSize: 22,
    position: 'absolute',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: {height: 0, width: 0},
    textShadowRadius: 8,
  },
  sparkleTop: {right: 38, top: 37},
  sparkleLeft: {left: 27, top: 119},
  sparkleRight: {right: 21, top: 155},
  brandLogo: {height: 270, width: 270},
  taglineRow: {alignItems: 'center', flexDirection: 'row', marginTop: -48},
  taglineLine: {backgroundColor: '#2878E9', height: 1, width: 84},
  taglineDot: {backgroundColor: '#1460E8', borderRadius: 4, height: 8, marginHorizontal: 12, width: 8},
  brandSubtitle: {
    color: '#122D65',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 34,
    elevation: 8,
    marginHorizontal: 28,
    padding: 24,
    shadowColor: '#34537F',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.17,
    shadowRadius: 18,
  },
  sheetShort: {padding: 20},
  welcomeRow: {alignItems: 'center', flexDirection: 'row'},
  welcomeIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 31,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  welcomeCopy: {flex: 1, marginLeft: 15, minWidth: 0},
  title: {color: '#102653', fontSize: 27, fontWeight: '900', letterSpacing: -0.8},
  subtitle: {color: '#657595', fontSize: 15, fontWeight: '500', marginTop: 3},
  form: {marginTop: 22},
  passwordField: {marginTop: 14},
  field: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE6F5',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 70,
    paddingHorizontal: 16,
  },
  fieldCopy: {flex: 1, marginLeft: 14, minWidth: 0},
  fieldLabel: {color: '#637391', fontSize: 14, fontWeight: '700'},
  input: {color: '#152C5A', fontSize: 17, minHeight: 31, padding: 0},
  eyeButton: {alignItems: 'center', height: 42, justifyContent: 'center', width: 42},
  helperText: {marginTop: 2, paddingHorizontal: 0},
  forgotButton: {alignSelf: 'flex-end', marginBottom: 18, marginTop: 12},
  forgotText: {color: '#075FE4', fontSize: 15, fontWeight: '800'},
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#075FE4',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 58,
  },
  loginButtonLabel: {color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginRight: 9},
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 22,
  },
  accountRowNarrow: {flexDirection: 'column', gap: 4},
  accountText: {color: '#657595', fontSize: 15, fontWeight: '500'},
  contactText: {color: '#075FE4', fontSize: 15, fontWeight: '800'},
  verificationContent: {justifyContent: 'center'},
  verificationSheet: {alignItems: 'center', marginTop: 30},
  verificationIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 28,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  verificationTitle: {color: '#102653', fontSize: 24, fontWeight: '900', marginTop: 18},
  verificationMessage: {
    color: '#657595',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 9,
    textAlign: 'center',
  },
  verificationFeedback: {fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 16, textAlign: 'center'},
  verificationError: {color: '#B91C1C'},
  verificationSuccess: {color: '#15803D'},
  verificationButton: {alignSelf: 'stretch', marginTop: 18},
  useAnotherAccountButton: {marginTop: 18, padding: 6},
  useAnotherAccountText: {color: '#2563EB', fontSize: 14, fontWeight: '800'},
  pressed: {opacity: 0.78, transform: [{scale: 0.99}]},
});
