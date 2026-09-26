import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';

const C = {
  bg: '#F5F6FA',
  field: '#FFFFFF',
  fieldBorder: '#E4E6F0',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  dot: '#C9B79A',
  error: '#D62839',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { register, isSubmitting } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const onSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Fill in your name, email and password.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const result = await register({ name: trimmedName, email: trimmedEmail, password });
    if (result.success) {
      router.replace('/(tabs)/explore');
    } else {
      setError(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
              hitSlop={10}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={C.ink} />
            </Pressable>

            <View style={styles.brandRow}>
              <Text style={styles.brand}>WEARX</Text>
              <View style={styles.brandDot} />
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>NEW CLIENT REGISTRATION</Text>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join WearX for bespoke orders, archive tracking, and curated private releases.
          </Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Alexander Vance"
                placeholderTextColor={C.muted}
                style={styles.input}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
              <Ionicons name="person-outline" size={18} color={C.muted} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={C.muted}
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <Ionicons name="at-outline" size={18} color={C.muted} />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.hint}>MIN. 8 CHARS</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={C.muted}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={C.muted}
                />
              </Pressable>
            </View>
          </View>

          <Text style={styles.terms}>
            By registering, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
            <Text style={styles.termsLink}>Privacy Protocol</Text>.
          </Text>

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>CREATE ACCOUNT</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Apple sign-in', 'Coming soon.')}
            >
              <Ionicons name="logo-apple" size={18} color={C.ink} />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Google sign-in', 'Coming soon.')}
            >
              <Ionicons name="logo-google" size={17} color={C.ink} />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={6}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 32, flexGrow: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  topBarSpacer: { width: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: 1.4, color: C.ink },
  brandDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.dot, marginBottom: 4 },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: C.body },

  title: { fontSize: 36, fontWeight: '800', color: C.ink, marginTop: 8 },
  subtitle: { fontSize: 14, color: C.body, lineHeight: 20, marginTop: 10, maxWidth: 320 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCE9EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 20,
  },
  errorText: { flex: 1, color: C.error, fontSize: 12, fontWeight: '600' },

  field: { marginTop: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: C.ink },
  hint: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: C.muted },

  inputRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.fieldBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: C.ink },

  terms: { fontSize: 12, color: C.body, lineHeight: 18, marginTop: 18 },
  termsLink: { color: C.ink, fontWeight: '700', textDecorationLine: 'underline' },

  submitBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ink,
    borderRadius: 27,
    height: 56,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.6 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DEE1EC' },
  dividerText: { fontSize: 10, letterSpacing: 1, color: C.muted, fontWeight: '700' },

  socialRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF0F8',
    borderRadius: 27,
    height: 50,
  },
  socialText: { fontSize: 14, fontWeight: '600', color: C.ink },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerText: { fontSize: 13, color: C.body },
  footerLink: { fontSize: 13, color: C.ink, fontWeight: '700', textDecorationLine: 'underline' },
});