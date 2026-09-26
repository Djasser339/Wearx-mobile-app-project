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
  field: '#EEF0F8',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  dot: '#C9B79A',
  error: '#D62839',
};

export default function Login() {
  const { login, isSubmitting } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const onSubmit = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    const result = await login({ email: trimmedEmail, password });
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

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>WEARX ATELIER</Text>
          </View>

          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Enter your credentials to access your account and orders.
          </Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
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
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>PASSWORD</Text>
              <Pressable
                onPress={() => Alert.alert('Password reset', 'Coming soon.')}
                hitSlop={8}
              >
                <Text style={styles.forgot}>FORGOT?</Text>
              </Pressable>
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={C.muted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
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
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/signup')} hitSlop={6}>
              <Text style={styles.footerLink}>Sign Up</Text>
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

  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#E7E9F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 24,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.dot },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.body },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginTop: 18,
  },
  subtitle: {
    fontSize: 14,
    color: C.body,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    marginHorizontal: 8,
  },

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

  field: { marginTop: 22 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: C.ink },
  forgot: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: C.muted },

  input: {
    marginTop: 8,
    backgroundColor: C.field,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 14,
    color: C.ink,
  },
  passwordRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  passwordInput: { flex: 1, fontSize: 14, color: C.ink, letterSpacing: 2 },

  submitBtn: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ink,
    borderRadius: 27,
    height: 54,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
    backgroundColor: C.field,
    borderRadius: 27,
    height: 50,
  },
  socialText: { fontSize: 14, fontWeight: '600', color: C.ink },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: { fontSize: 13, color: C.body },
  footerLink: { fontSize: 13, color: C.ink, fontWeight: '700', textDecorationLine: 'underline' },
});