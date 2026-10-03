
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import {
  ApiError,
  resendVerificationRequest,
  verifyEmailCodeRequest,
} from '../../services/api';

const C = {
  bg: '#F5F6FA',
  field: '#FFFFFF',
  fieldBorder: '#E4E6F0',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  dot: '#C9B79A',
  error: '#D62839',
  success: '#2FBF71',
  iconBg: '#E9EDFB',
};

const CODE_LENGTH = 6;

// Matches the backend's RESEND_COOLDOWN_MS in authController.js — this is
// just what the countdown starts at; the server is the real authority and
// will reject an early resend regardless of what this screen shows.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const { user, token, updateUser } = useAuth();

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputs = useRef([]);
  const code = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const formattedCooldown = `00:${String(cooldown).padStart(2, '0')}`;

  // Handles both typing one digit and pasting/autofilling the whole code
  // at once (iOS/Android often offer a one-tap "paste code" suggestion).
  const handleChange = (text, index) => {
    setError(null);
    const clean = text.replace(/[^0-9]/g, '');

    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = clean[i];
      }
      setDigits(next);
      const lastFilled =
        Math.min(index + clean.length, CODE_LENGTH) - 1;
      inputs.current[lastFilled]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (
      nativeEvent.key === 'Backspace' &&
      !digits[index] &&
      index > 0
    ) {
      inputs.current[index - 1]?.focus();
    }
  };

  const resetBoxes = () => {
    setDigits(Array(CODE_LENGTH).fill(''));
    inputs.current[0]?.focus();
  };

  const onVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Enter all 6 digits.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsVerifying(true);

    try {
      await verifyEmailCodeRequest(token, code);
      updateUser({ isVerified: true });
      router.replace('/(tabs)/explore');
    } catch (e) {
      console.error('verify ERROR:', e);
      setError(
        e instanceof ApiError
          ? e.message
          : 'Something went wrong. Try again.'
      );
      resetBoxes();
    } finally {
      setIsVerifying(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setIsResending(true);

    try {
      await resendVerificationRequest(token);
      setInfo('A new code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      resetBoxes();
    } catch (e) {
      console.error('RESEND ERROR:', e);
      setError(
        e instanceof ApiError
          ? e.message
          : 'Something went wrong. Try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={Keyboard.dismiss}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace('/(auth)/login')
              }
              hitSlop={10}
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={C.ink}
              />
            </Pressable>

            <View style={styles.brandRow}>
              <View style={styles.brandTile}>
                <Text style={styles.brandTileText}>WX</Text>
              </View>

              <Text style={styles.brand}>WEARX</Text>
            </View>

            <Text style={styles.topBarTitle}>
              Email Verification
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="mail-outline"
                size={28}
                color={C.ink}
              />
            </View>

            <Text style={styles.eyebrow}>
              SECURITY CHECKPOINT
            </Text>

            <Text style={styles.title}>
              Verify Email
            </Text>

            <Text style={styles.subtitle}>
              We sent a 6-digit confirmation code to your{'\n'}
              registered account
            </Text>

            <View style={styles.emailPill}>
              <Text style={styles.emailPillText}>
                {user?.email ?? ''}
              </Text>

              {/* There's no "change email before verifying" endpoint yet, so
                  this stays visual rather than pretending to be editable. */}
              <Feather
                name="edit-2"
                size={13}
                color={C.muted}
                style={{ opacity: 0.4 }}
              />
            </View>

            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={C.error}
                />
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}

            {!!info && (
              <View style={styles.infoBanner}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={C.success}
                />
                <Text style={styles.infoText}>
                  {info}
                </Text>
              </View>
            )}

            <View style={styles.codeRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputs.current[i] = r)}
                  value={d}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={i === 0 ? CODE_LENGTH : 1}
                  style={[
                    styles.codeBox,
                    d !== '' && styles.codeBoxFilled,
                  ]}
                  textAlign="center"
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <Pressable
              onPress={onResend}
              disabled={isResending || cooldown > 0}
              hitSlop={8}
              style={styles.resendRow}
            >
              {isResending ? (
                <ActivityIndicator
                  size="small"
                  color={C.muted}
                />
              ) : (
                <Text style={styles.resendText}>
                  Didn't receive the code?{' '}
                  <Text
                    style={{
                      fontWeight: '700',
                      color:
                        cooldown > 0
                          ? C.muted
                          : C.ink,
                    }}
                  >
                    {cooldown > 0
                      ? `Resend in ${formattedCooldown}`
                      : 'Resend'}
                  </Text>
                </Text>
              )}
            </Pressable>

            <Text style={styles.spamNote}>
              CHECK SPAM OR ARCHIVE FOLDERS
            </Text>

            <Pressable
              style={[
                styles.submitBtn,
                (isVerifying ||
                  code.length !== CODE_LENGTH) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={onVerify}
              disabled={
                isVerifying ||
                code.length !== CODE_LENGTH
              }
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    VERIFY & CONTINUE
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color="#fff"
                  />
                </>
              )}
            </Pressable>

            <View style={styles.encRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={C.muted}
              />

              <Text style={styles.encText}>
                SECURED WITH HASHED, TIME-LIMITED CODES
              </Text>
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoBlockIcon}>
                <Feather
                  name="unlock"
                  size={16}
                  color={C.ink}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.infoBlockTitle}>
                  WHY VERIFY?
                </Text>

                <Text style={styles.infoBlockBody}>
                  Confirms this email is really yours, so order
                  updates and account recovery actually reach you.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                router.replace('/(tabs)/explore')
              }
              hitSlop={8}
              style={styles.skipRow}
            >
              <Text style={styles.skipText}>
                Skip for now
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  brandTile: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandTileText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.ink,
  },

  topBarTitle: {
    marginLeft: 'auto',
    fontSize: 13,
    color: C.body,
    fontWeight: '500',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.body,
    marginTop: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.ink,
    marginTop: 6,
  },

  subtitle: {
    fontSize: 14,
    color: C.body,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },

  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E7E9F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 18,
  },

  emailPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCE9EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 18,
    alignSelf: 'stretch',
  },

  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 12,
    fontWeight: '600',
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F7EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 18,
    alignSelf: 'stretch',
  },

  infoText: {
    flex: 1,
    color: C.success,
    fontSize: 12,
    fontWeight: '600',
  },

  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },

  codeBox: {
    width: 44,
    height: 56,
    borderWidth: 1.5,
    borderColor: C.fieldBorder,
    borderRadius: 12,
    backgroundColor: C.field,
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
  },

  codeBoxFilled: {
    borderColor: C.ink,
  },

  resendRow: {
    marginTop: 20,
  },

  resendText: {
    fontSize: 13,
    color: C.body,
  },

  spamNote: {
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    fontWeight: '600',
    marginTop: 8,
  },

  submitBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ink,
    borderRadius: 27,
    height: 56,
    alignSelf: 'stretch',
  },

  submitBtnDisabled: {
    opacity: 0.5,
  },

  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.6,
  },

  encRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },

  encText: {
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.muted,
    fontWeight: '600',
  },

  infoBlock: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#E9EDFB',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    alignSelf: 'stretch',
  },

  infoBlockIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBlockTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: C.ink,
  },

  infoBlockBody: {
    fontSize: 12,
    color: C.body,
    lineHeight: 17,
    marginTop: 4,
  },

  skipRow: {
    marginTop: 20,
    marginBottom: 20,
  },

  skipText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

