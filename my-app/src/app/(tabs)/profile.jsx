import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { getMyOrdersRequest, getWishlistRequest } from '../../services/api';

/* =========================================================================
 *  Menu rows — none of these have a real screen yet, so each just
 *  acknowledges the tap instead of navigating somewhere broken.
 * ========================================================================= */

const MENU = [
  { id: 'orders', icon: 'package', title: 'My Orders', sub: 'View purchases and delivery status' },
  { id: 'help', icon: 'headphones', title: 'Help & Support', sub: 'Order and delivery questions' },
];

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'shipped']);

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

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function Profile() {
  const { user, token, logout } = useAuth();

  const [orders, setOrders] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isFirstFocus = useRef(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ordersRes, wishlistRes] = await Promise.all([
        getMyOrdersRequest(token),
        getWishlistRequest(token),
      ]);
      setOrders(ordersRes.data || []);
      setWishlistCount((wishlistRes.data?.products || []).length);
    } catch (e) {
      setError(e?.message ?? 'Failed to load your account data');
    }
  }, [token]);

  /* Refresh every time this tab gains focus — first time shows the
   * spinner, every time after (e.g. after placing an order or hearting
   * something elsewhere) refreshes silently in the background so the
   * stats stay accurate without a manual pull-to-refresh. */
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        (async () => {
          await load();
          setLoading(false);
        })();
      } else {
        load();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;

    // No address-book feature exists yet, so this counts distinct shipping
    // addresses seen across past orders — a reasonable stand-in, not a
    // real saved-addresses list.
    const distinctAddresses = new Set(
      orders
        .filter((o) => o.shippingAddress)
        .map((o) => `${o.shippingAddress.address}|${o.shippingAddress.city}`)
    ).size;

    return {
      orders: orders.length,
      activeOrders,
      wishlist: wishlistCount,
      addresses: distinctAddresses,
    };
  }, [orders, wishlistCount]);

  const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : '—';
  const canSellerStudio = user?.role && user.role !== 'customer';

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);

  const openMenuItem = (id) => {
    if (id === 'orders') router.push('/orders');
    if (id === 'help') router.push('/support');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.loader]} edges={[]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.ink} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />
        }
      >
        {/* identity */}
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            {user?.avatar ? (
              <View style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials(user?.name)}</Text>
              </View>
            )}
            <Pressable
              style={styles.cameraBtn}
              hitSlop={6}
              onPress={() => comingSoon('Profile photo upload')}
            >
              <Feather name="camera" size={14} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name ?? '—'}</Text>
          </View>
          <Text style={styles.email}>{user?.email ?? ''}</Text>

          <View style={styles.memberChip}>
            <View style={styles.memberDot} />
            <Text style={styles.memberText}>MEMBER SINCE {memberSince}</Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* stats */}
        <View style={styles.stats}>
          <Stat value={stats.orders} label="ORDERS" />
          <Stat value={stats.wishlist} label="WISHLIST" />
          <Stat value={stats.addresses} label="ADDRESSES" />
        </View>

        {/* seller studio — only relevant for non-customer roles */}
        {canSellerStudio && (
          <Pressable style={styles.studio} onPress={() => comingSoon('Seller Studio')}>
            <View style={styles.studioCircle} />
            <View style={{ flex: 1 }}>
              <View style={styles.studioTop}>
                <Text style={styles.studioEyebrow}>WEARX ATELIER</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>{user.role.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.studioTitle}>Seller Studio</Text>
              <Text style={styles.studioSub}>Manage capsule drops, live inventory & orders</Text>
            </View>
            <View style={styles.studioArrow}>
              <Feather name="arrow-right" size={18} color={C.ink} />
            </View>
          </Pressable>
        )}

        {/* menu */}
        <View style={styles.menu}>
          {MENU.map((item) => {
            const badge =
              item.id === 'orders' && stats.activeOrders > 0
                ? `${stats.activeOrders} ACTIVE`
                : null;
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                onPress={() => openMenuItem(item.id)}
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
                {!!badge && (
                  <View style={styles.rowBadge}>
                    <Text style={styles.rowBadgeText}>{badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </Pressable>
            );
          })}
        </View>

        {/* log out */}
        <Pressable style={styles.logout} onPress={confirmLogout}>
          <Feather name="log-out" size={17} color={C.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>WEARX V{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loader: { alignItems: 'center', justifyContent: 'center' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FCE9EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: '600' },

  identity: { alignItems: 'center', paddingTop: 20 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: C.surface,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 41, backgroundColor: C.line },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 41,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 26, fontWeight: '700' },
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
  proBadge: { backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
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
  rowBadge: { backgroundColor: C.sand, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
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