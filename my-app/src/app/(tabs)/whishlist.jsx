import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import {
  ApiError,
  getWishlistRequest,
  removeFromWishlistRequest,
} from '../../services/api';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';
const CURRENCY = 'DA';

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

function mapWishlistProduct(p) {
  return {
    id: p._id,
    brand: p.brand,
    name: p.name,
    color: p.colors?.[0] ?? '',
    price: p.price,
    tag: p.tag ? { label: p.tag, tone: p.tag === 'NEW' ? 'dark' : 'sand' } : null,
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
  };
}

const C = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  line: '#ECEEF1',
  chipBg: '#E6EAF8',
  chipText: '#5B6480',
  banner: '#EAEEFA',
  sand: '#F1E4C8',
  danger: '#C1272D',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function Wishlist() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 16 * 2 - 12) / 2;
  const { token, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isFirstFocus = useRef(true);
  const removePending = useRef(new Set());

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    try {
      setError(null);
      const res = await getWishlistRequest(token);
      if (removePending.current.size > 0) return; // don't clobber an optimistic removal in flight
      setItems((res.data?.products || []).map(mapWishlistProduct));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your wishlist.');
    }
  }, [token, isAuthenticated]);

  /* Refresh every time this tab gains focus — first time shows the
   * spinner, every time after that (e.g. after hearting something on
   * Explore) refreshes silently. */
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

  const removeItem = useCallback(async (id) => {
    if (removePending.current.has(id)) return;
    removePending.current.add(id);

    const prev = items;
    setItems((cur) => cur.filter((x) => x.id !== id));

    try {
      await removeFromWishlistRequest(token, id);
    } catch (e) {
      setItems(prev); // rollback
      setError(e instanceof ApiError ? e.message : 'Could not remove that item.');
    } finally {
      removePending.current.delete(id);
    }
  }, [items, token]);

  const count = items.length;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.screen, styles.loader]} edges={[]}>
        <StatusBar style="dark" />
        <View style={styles.emptyIcon}>
          <Ionicons name="heart-outline" size={30} color={C.ink} />
        </View>
        <Text style={styles.emptyTitle}>Log in to see your wishlist</Text>
        <Text style={styles.emptyBody}>Your saved items are tied to your account.</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.emptyBtnText}>Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Wishlist</Text>
          <View style={styles.countChip}>
            <Text style={styles.countText}>
              {count} {count === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}


        {count > 0 ? (
          <View style={styles.grid}>
            {items.map((item) => (
              <WishCard
                key={item.id}
                item={item}
                width={cardWidth}
                onToggle={() => removeItem(item.id)}
                onPressCard={() => router.push(`/product/${item.id}`)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={30} color={C.ink} />
            </View>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptyBody}>
              Tap the heart on anything you like and it will be saved here.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.emptyBtnText}>Browse new arrivals</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WishCard({ item, width, onToggle, onPressCard }) {
  const imgW = width - 20;
  return (
    <Pressable style={[styles.card, { width }]} onPress={onPressCard}>
      <View style={[styles.media, { height: imgW * 1.32 }]}>
        <Image source={{ uri: item.image }} style={styles.mediaImg} />
        <HeartButton active onPress={onToggle} size={36} />
        {item.tag && (
          <View style={[styles.tag, item.tag.tone === 'dark' ? styles.tagDark : styles.tagSand]}>
            <Text style={[styles.tagText, { color: item.tag.tone === 'dark' ? '#fff' : C.body }]}>
              {item.tag.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.brandLabel} numberOfLines={1}>{item.brand.toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {!!item.color && <Text style={styles.color}>{item.color}</Text>}
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
      </View>
    </Pressable>
  );
}

function HeartButton({ active, onPress, size = 34 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handle}
      hitSlop={8}
      style={[styles.heart, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={size * 0.5} color={C.ink} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loader: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },

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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginTop: 22 },
  title: { fontFamily: serif, fontSize: 34, fontWeight: '700', color: C.ink },
  countChip: { backgroundColor: C.chipBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
  countText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, color: C.chipText },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.banner,
    borderRadius: 14,
  },
  bannerText: { flex: 1, fontFamily: serif, fontSize: 14, lineHeight: 20, color: C.body },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },

  card: { backgroundColor: C.surface, borderRadius: 20, padding: 10 },
  media: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.line },
  mediaImg: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { position: 'absolute', left: 10, bottom: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  tagDark: { backgroundColor: C.ink },
  tagSand: { backgroundColor: C.sand },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  body: { paddingTop: 12, paddingHorizontal: 2, paddingBottom: 4 },
  brandLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, color: C.body },
  name: { fontFamily: serif, fontSize: 17, color: C.ink, marginTop: 8 },
  color: { fontFamily: serif, fontSize: 14, color: C.muted, marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 14 },

  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: serif, fontSize: 21, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: { marginTop: 20, backgroundColor: C.ink, borderRadius: 26, paddingHorizontal: 22, paddingVertical: 13 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});