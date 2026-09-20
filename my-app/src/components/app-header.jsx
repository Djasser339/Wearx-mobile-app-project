import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BRAND = 'WEARX'; 
const AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80';
const HAS_UNREAD = true; // later: read this from shared state

export default function AppHeader() {
  const insets = useSafeAreaInsets(); // height of the status bar / notch

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>{BRAND}</Text>
        <View style={styles.brandDot} />
      </View>

      <View style={styles.actions}>
        <Pressable hitSlop={8}>
          <Ionicons name="search-outline" size={23} color="#0F1115" />
        </Pressable>
        <Pressable hitSlop={8}>
          <Ionicons name="notifications-outline" size={23} color="#0F1115" />
          {HAS_UNREAD && <View style={styles.bellDot} />}
        </Pressable>
        <Image source={{ uri: AVATAR }} style={styles.avatar} />
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
});