import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/* =========================================================================
 *  DATA — swap for real user data later
 * ========================================================================= */

const USER = {
  name: 'Alexander Vance',
  email: 'a.vance@studio.com',
  memberSince: 2023,
  verified: true,
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  stats: { orders: 4, wishlist: 8, addresses: 2 },
};

const MENU = [
  { id: 'orders',        icon: 'package',     title: 'My Orders',        sub: 'Track purchases & archival invoices', badge: '1 ACTIVE' },
  { id: 'addresses',     icon: 'map-pin',     title: 'Addresses',        sub: 'Saved shipping & billing addresses' },
  { id: 'payments',      icon: 'credit-card', title: 'Payment Methods',  sub: 'Cards & Apple Pay linked' },
  { id: 'settings',      icon: 'sliders',     title: 'Account Settings', sub: 'Personal details & security keys' },
  { id: 'notifications', icon: 'bell',        title: 'Notifications',    sub: 'Drop updates, restocks & concierge' },
  { id: 'help',          icon: 'headphones',  title: 'Help & Support',   sub: 'Direct concierge line & garment care FAQ' },
];

/* =========================================================================
 *  THEME
 * ========================================================================= */

const C = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  line: '#ECEEF1',
  chipBg: '#E6EAF8',
  iconBg: '#E9EDFB',
  sand: '#F1E4C8',
  danger: '#C1272D',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/* =========================================================================
 *  SCREEN
 * ========================================================================= */

export default function Profile() {
  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => router.replace('/') },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />

      

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        {/* identity */}
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: USER.avatar }} style={styles.avatar} />
            <Pressable style={styles.cameraBtn} hitSlop={6}>
              <Feather name="camera" size={14} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{USER.name}</Text>
            {USER.verified && (
              <MaterialCommunityIcons name="check-decagram" size={18} color={C.ink} />
            )}
          </View>
          <Text style={styles.email}>{USER.email}</Text>

          <View style={styles.memberChip}>
            <View style={styles.memberDot} />
            <Text style={styles.memberText}>MEMBER SINCE {USER.memberSince}</Text>
          </View>
        </View>

        {/* stats */}
        <View style={styles.stats}>
          <Stat value={USER.stats.orders} label="ORDERS" />
          <Stat value={USER.stats.wishlist} label="WISHLIST" />
          <Stat value={USER.stats.addresses} label="ADDRESSES" />
        </View>

        {/* seller studio */}
        <Pressable style={styles.studio}>
          <View style={styles.studioCircle} />
          <View style={{ flex: 1 }}>
            <View style={styles.studioTop}>
              <Text style={styles.studioEyebrow}>VANGUARD ATELIER</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.studioTitle}>Seller Studio</Text>
            <Text style={styles.studioSub}>Manage capsule drops, live inventory & orders</Text>
          </View>
          <View style={styles.studioArrow}>
            <Feather name="arrow-right" size={18} color={C.ink} />
          </View>
        </Pressable>

        {/* menu */}
        <View style={styles.menu}>
          {MENU.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
              // TODO: router.push('/your-route') for each item
            >
              <View style={styles.rowIcon}>
                <Feather name={item.icon} size={17} color={C.ink} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              {!!item.badge && (
                <View style={styles.rowBadge}>
                  <Text style={styles.rowBadgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
          ))}
        </View>

        {/* log out */}
        <Pressable style={styles.logout} onPress={confirmLogout}>
          <Feather name="log-out" size={17} color={C.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>VANGUARD V3.4.1 — COPENHAGEN</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================================
 *  PIECES
 * ========================================================================= */

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* =========================================================================
 *  STYLES
 * ========================================================================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.surface,
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: 1.4, color: C.ink },
  brandDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9B79A', marginBottom: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D62839',
  },
  headerAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.line },

  identity: { alignItems: 'center', paddingTop: 20 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: C.surface,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 41, backgroundColor: C.line },
  cameraBtn: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: C.bg,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  name: { fontFamily: serif, fontSize: 21, fontWeight: '700', color: C.ink },
  email: { fontFamily: serif, fontSize: 13.5, color: C.body, marginTop: 4 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    backgroundColor: C.chipBg,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5B6480' },
  memberText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9, color: C.ink },

  stats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: C.ink },
  statLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 1.3, color: C.body, marginTop: 4 },

  studio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    overflow: 'hidden',
  },
  studioCircle: {
    position: 'absolute',
    right: -40,
    bottom: -50,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  studioTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  studioEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.3, color: '#9AA0A8' },
  proBadge: {
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  proText: { fontFamily: serif, fontSize: 10, fontWeight: '800', color: C.ink },
  studioTitle: { fontFamily: serif, fontSize: 19, fontWeight: '700', color: '#fff', marginTop: 6 },
  studioSub: { fontFamily: serif, fontSize: 12, color: '#9AA0A8', marginTop: 4, maxWidth: 220 },
  studioArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  menu: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 4,
    backgroundColor: C.surface,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: serif, fontSize: 15, color: C.ink },
  rowSub: { fontFamily: serif, fontSize: 12, color: C.muted, marginTop: 2 },
  rowBadge: {
    backgroundColor: C.sand,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  rowBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.ink },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    height: 48,
    backgroundColor: C.surface,
    borderRadius: 24,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: C.danger, letterSpacing: 0.4 },

  version: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: C.muted,
  },
});