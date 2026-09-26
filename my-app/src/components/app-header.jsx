import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/auth-context';

const BRAND = 'WEARX';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function AppHeader() {
  const insets = useSafeAreaInsets(); // height of the status bar / notch
  const { user } = useAuth();

  // Was hardcoded to `true` before, so the red dot never reflected reality.
  // Wire this to a real unread count once notifications exist; for now it
  // simply stays off, which is more honest than a permanent fake badge.
  const unreadCount = 0;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>{BRAND}</Text>
        <View style={styles.brandDot} />
      </View>

      <View style={styles.actions}>
        <Pressable
          hitSlop={8}
          onPress={() => router.push('/(tabs)/shop')}
          accessibilityLabel="Search products"
        >
          <Ionicons name="search-outline" size={23} color="#0F1115" />
        </Pressable>

        <Pressable hitSlop={8} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={23} color="#0F1115" />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityLabel="Your profile"
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  brand: { fontSize: 21, fontWeight: '800', letterSpacing: 1.6, color: '#0F1115' },
  brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C9B79A', marginBottom: 5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D62839',
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECEEF1' },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});