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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({navigation}: Props) => {
  const {height, width} = useWindowDimensions();
  const {signIn, resendVerification, loading, authError} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const isShortScreen = height < 740;
  const isNarrowScreen = width < 380;

  const logoSize = isShortScreen ? 144 : isNarrowScreen ? 180 : 220;
  const contentMinHeight = Math.max(height - 32, 0);
  const fieldMinHeight = isShortScreen ? 58 : 68;
  const inputMinHeight = isShortScreen ? 50 : 60;
  const loginButtonHeight = isShortScreen ? 56 : 66;
  const footerScale = isShortScreen ? 0.74 : isNarrowScreen ? 0.9 : 1;
  const contentMinHeightStyle = {minHeight: contentMinHeight};
  const fieldHeightStyle = {minHeight: fieldMinHeight};
  const footerElementScaleStyle = {transform: [{scale: footerScale}]};
  const inputHeightStyle = {minHeight: inputMinHeight};
  const loginButtonHeightStyle = {minHeight: loginButtonHeight};
  const logoSizeStyle = {height: logoSize, width: logoSize};

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
    try {
      await signIn(email, password);
    } catch {
      // AuthContext exposes the readable Firebase error.
    }
  };

  const handleResend = async () => {
    if (!isEmail(email) || !password) {
      setError('Please enter your email and password to resend the verification link.');
      return;
    }
    setError('');
    try {
      await resendVerification(email, password);
      setError('Verification email resent. Please check your inbox.');
    } catch {
      // AuthContext handles error
    }
  };

  return (
    <Screen
      style={[
        styles.content,
        isShortScreen && styles.contentShort,
        isNarrowScreen && styles.contentNarrow,
        contentMinHeightStyle,
      ]}>
      <View
        style={[
          styles.backgroundDotGrid,
          isShortScreen && styles.backgroundDotGridShort,
          isNarrowScreen && styles.backgroundDotGridNarrow,
        ]}>
        {Array.from({length: 9}).map((_, index) => (
          <View key={index} style={styles.backgroundDot} />
        ))}
      </View>
      <View
        style={[
          styles.backgroundCircle,
          isShortScreen && styles.backgroundCircleShort,
        ]}
      />

      <View style={[styles.brand, isShortScreen && styles.brandShort]}>
        <Image
          source={classTrackLogo}
          style={[styles.logoImage, logoSizeStyle]}
          resizeMode="contain"
        />
        <Text style={styles.brandSubtitle}>
          Attendance. Activities. Progress.
        </Text>
      </View>

      <View style={[styles.welcome, isShortScreen && styles.welcomeShort]}>
        <Text style={[styles.title, isShortScreen && styles.titleShort]}>
          Welcome Back!
        </Text>
        <Text style={styles.subtitle}>Login to continue to your account</Text>
      </View>

      <View style={[styles.form, isShortScreen && styles.formShort]}>
        <Text style={styles.label}>Email</Text>
        <View
          style={[
            styles.inputWrap,
            isNarrowScreen && styles.inputWrapNarrow,
            fieldHeightStyle,
          ]}>
          <MaterialCommunityIcons
            name="email-outline"
            size={28}
            color="#747A8A"
          />
          <RNTextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor="#7B8191"
            style={[
              styles.input,
              isNarrowScreen && styles.inputNarrow,
              inputHeightStyle,
            ]}
          />
        </View>

        <Text
          style={[
            styles.label,
            styles.passwordLabel,
            isShortScreen && styles.passwordLabelShort,
          ]}>
          Password
        </Text>
        <View
          style={[
            styles.inputWrap,
            isNarrowScreen && styles.inputWrapNarrow,
            fieldHeightStyle,
          ]}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={29}
            color="#747A8A"
          />
          <RNTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#7B8191"
            secureTextEntry={!passwordVisible}
            style={[
              styles.input,
              isNarrowScreen && styles.inputNarrow,
              inputHeightStyle,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? 'Hide password' : 'Show password'
            }
            onPress={() => setPasswordVisible(current => !current)}
            hitSlop={10}
            style={styles.eyeButton}>
            <MaterialCommunityIcons
              name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={28}
              color="#747A8A"
            />
          </Pressable>
        </View>

        <HelperText
          type="error"
          visible={Boolean(error || authError)}
          style={styles.helperText}>
          {error || authError || ' '}
        </HelperText>
        
        {authError?.includes('verify your email') ? (
          <Pressable style={styles.forgotButton} onPress={handleResend} disabled={loading}>
            <Text style={styles.forgotText}>Resend Verification Email</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        )}

        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={handleLogin}
          buttonColor="#075FE4"
          textColor="#FFFFFF"
          style={styles.loginButton}
          contentStyle={[
            styles.loginButtonContent,
            loginButtonHeightStyle,
          ]}
          labelStyle={styles.loginButtonLabel}>
          Login
        </Button>

        <View
          style={[
            styles.accountRow,
            isShortScreen && styles.accountRowShort,
            isNarrowScreen && styles.accountRowNarrow,
          ]}>
          <Text style={styles.accountText}>Don&apos;t have an account?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('StudentVerification')}>
            <Text style={styles.contactText}>Register as student</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.footerScene,
          isShortScreen && styles.footerSceneShort,
          isNarrowScreen && styles.footerSceneNarrow,
        ]}>
        <View style={styles.footerHill} />
        <View
          style={[styles.treeLeft, footerElementScaleStyle]}>
          <View style={styles.treeTop} />
          <View style={styles.treeTrunk} />
        </View>
        <View
          style={[styles.treeRight, footerElementScaleStyle]}>
          <View style={styles.treeTop} />
          <View style={styles.treeTrunk} />
        </View>
        <View
          style={[
            styles.schoolBuilding,
            footerElementScaleStyle,
          ]}>
          <View style={styles.schoolRoof} />
          <View style={styles.flagPole} />
          <View style={styles.flag} />
          <View style={styles.clock} />
          <View style={styles.schoolDoor} />
          <View style={styles.windowRow}>
            <View style={styles.window} />
            <View style={styles.window} />
            <View style={styles.window} />
          </View>
        </View>
        <View style={styles.homeIndicator} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 26,
  },
  accountRowNarrow: {
    flexDirection: 'column',
    gap: 4,
  },
  accountRowShort: {
    marginTop: 18,
  },
  accountText: {
    color: '#7B8191',
    fontSize: 17,
    fontWeight: '500',
  },
  backgroundCircle: {
    backgroundColor: '#DDE8FC',
    borderRadius: 88,
    height: 176,
    opacity: 0.76,
    position: 'absolute',
    right: -84,
    top: 88,
    width: 176,
  },
  backgroundCircleShort: {
    top: 58,
  },
  backgroundDot: {
    backgroundColor: '#C9D9F7',
    borderRadius: 4,
    height: 8,
    margin: 8,
    width: 8,
  },
  backgroundDotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    left: 38,
    position: 'absolute',
    top: 104,
    width: 76,
  },
  backgroundDotGridNarrow: {
    left: 24,
  },
  backgroundDotGridShort: {
    top: 76,
  },
  brand: {
    alignItems: 'center',
    marginTop: 40,
  },
  brandShort: {
    marginTop: 16,
  },
  brandSubtitle: {
    color: '#7B8191',
    fontSize: 17,
    fontWeight: '500',
    marginTop: 6,
  },
  clock: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#AFC6EE',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    marginTop: 10,
    width: 20,
  },
  contactText: {
    color: '#075FE4',
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  contentNarrow: {
    paddingHorizontal: 20,
  },
  contentShort: {
    paddingTop: 8,
  },
  eyeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  flag: {
    backgroundColor: '#7DA3E5',
    height: 11,
    left: 111,
    position: 'absolute',
    top: -26,
    width: 22,
  },
  flagPole: {
    backgroundColor: '#7DA3E5',
    height: 34,
    left: 110,
    position: 'absolute',
    top: -26,
    width: 3,
  },
  footerHill: {
    backgroundColor: '#E4EEFC',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    bottom: -42,
    height: 126,
    left: -50,
    position: 'absolute',
    right: -50,
  },
  footerScene: {
    height: 150,
    marginHorizontal: -28,
    marginTop: 20,
    overflow: 'hidden',
  },
  footerSceneNarrow: {
    marginHorizontal: -20,
  },
  footerSceneShort: {
    height: 104,
    marginTop: 10,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    color: '#075FE4',
    fontSize: 17,
    fontWeight: '800',
  },
  form: {
    marginTop: 40,
  },
  formShort: {
    marginTop: 24,
  },
  helperText: {
    minHeight: 28,
    paddingHorizontal: 0,
  },
  homeIndicator: {
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 3,
    bottom: 10,
    height: 6,
    position: 'absolute',
    width: 152,
  },
  input: {
    color: '#16264B',
    flex: 1,
    fontSize: 18,
    minHeight: 60,
    paddingHorizontal: 20,
  },
  inputNarrow: {
    paddingHorizontal: 14,
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6ECF6',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 22,
    shadowColor: '#8BA0BE',
    shadowOffset: {height: 6, width: 0},
    shadowOpacity: 0.17,
    shadowRadius: 14,
  },
  inputWrapNarrow: {
    paddingHorizontal: 16,
  },
  label: {
    color: '#16264B',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  loginButton: {
    borderRadius: 12,
    elevation: 0,
  },
  loginButtonContent: {
    minHeight: 66,
  },
  loginButtonLabel: {
    fontSize: 19,
    fontWeight: '900',
  },
  logoImage: {
    height: 220,
    width: 220,
  },
  passwordLabel: {
    marginTop: 20,
  },
  passwordLabelShort: {
    marginTop: 14,
  },
  schoolBuilding: {
    backgroundColor: '#D3E2FA',
    borderColor: '#B8CEF3',
    borderRadius: 5,
    borderWidth: 1,
    bottom: 20,
    height: 78,
    left: '50%',
    marginLeft: -118,
    position: 'absolute',
    width: 236,
  },
  schoolDoor: {
    alignSelf: 'center',
    backgroundColor: '#9DBCEB',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    bottom: 0,
    height: 28,
    position: 'absolute',
    width: 30,
  },
  schoolRoof: {
    alignSelf: 'center',
    backgroundColor: '#C1D5F6',
    height: 30,
    marginTop: -18,
    transform: [{rotate: '45deg'}],
    width: 30,
  },
  subtitle: {
    color: '#7B8191',
    fontSize: 20,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  title: {
    color: '#16264B',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  titleShort: {
    fontSize: 28,
  },
  treeLeft: {
    alignItems: 'center',
    bottom: 24,
    left: 52,
    position: 'absolute',
  },
  treeRight: {
    alignItems: 'center',
    bottom: 24,
    position: 'absolute',
    right: 58,
  },
  treeTop: {
    backgroundColor: '#8EB0E9',
    borderRadius: 20,
    height: 52,
    width: 28,
  },
  treeTrunk: {
    backgroundColor: '#79A0DF',
    height: 30,
    marginTop: -4,
    width: 4,
  },
  welcome: {
    alignItems: 'center',
    marginTop: 50,
  },
  welcomeShort: {
    marginTop: 24,
  },
  window: {
    backgroundColor: '#9DBCEB',
    borderRadius: 2,
    height: 14,
    width: 16,
  },
  windowRow: {
    bottom: 28,
    flexDirection: 'row',
    gap: 12,
    left: 36,
    position: 'absolute',
  },
});
