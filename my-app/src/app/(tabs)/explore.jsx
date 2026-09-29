import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useCart } from '../../context/cart-context';
import {
  ApiError,
  addToWishlistRequest,
  getProductsRequest,
  getWishlistRequest,
  removeFromWishlistRequest,
} from '../../services/api';

/* =========================================================================
 *  LOCAL CONTENT
 * ========================================================================= */

const CURRENCY = 'DA';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';

const HERO_HEIGHT = 240;
const HERO_GAP = 12;
const HERO_INTERVAL = 5000; // ms between auto-advances
const HERO_MAX = 4;

// Matches the `category` enum on your Product schema.
const CATEGORIES = [
  { id: 'T-Shirts',    label: 'T-Shirts',    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=70' },
  { id: 'Shirts',      label: 'Shirts',      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&q=70' },
  { id: 'Pants',       label: 'Pants',       image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&q=70' },
  { id: 'Shorts',      label: 'Shorts',      image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=300&q=70' },
  { id: 'Jackets',     label: 'Jackets',     image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=70' },
  { id: 'Shoes',       label: 'Shoes',       image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&q=70' },
  { id: 'Accessories', label: 'Accessories', image: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23f?w=300&q=70' },
];

/* ---- adapters: backend Product doc -> UI shape --------------------------- */

function mapProduct(p) {
  return {
    id: p._id,
    brand: p.brand,
    name: p.name,
    color: p.colors?.[0] ?? '',
    price: p.price,
    rating: p.rating > 0 ? p.rating : null,
    isNew: p.tag === 'NEW',
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
  };
}

function mapStyle(p) {
  return {
    id: p._id,
    brand: p.brand,
    name: p.name,
    price: p.price,
    badge: p.stock <= 5 ? 'Low stock' : 'Best seller',
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
  };
}

function mapHero(p) {
  return {
    id: p._id,
    brand: p.brand,
    name: p.name,
    price: p.price,
    label: p.tag === 'NEW' ? 'New in' : 'Featured',
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
  };
}

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

/* =========================================================================
 *  SCREEN
 * ========================================================================= */

const C = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  line: '#ECEEF1',
  chipBg: '#EDF0FA',
  accentSoft: '#E9EDFB',
  danger: '#C1272D',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function Explore() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 16 * 2 - 12) / 2;
  const heroWidth = width - 16 * 2;
  const heroStep = heroWidth + HERO_GAP;

  const { token, isAuthenticated } = useAuth();
  const { count: cartCount } = useCart();

  const [arrivals, setArrivals] = useState([]);
  const [popularStyles, setPopularStyles] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  const requestId = useRef(0);
  const didMountSearch = useRef(false);
  const isFirstFocus = useRef(true);
  const wishlistPending = useRef(new Set());
  const heroRef = useRef(null);

  /* ---- load products ------------------------------------------------- */
  const load = useCallback(async () => {
    const thisRequest = ++requestId.current;
    try {
      setError(null);
      const [arrivalsRes, popularRes, featuredRes] = await Promise.all([
        getProductsRequest({
          category: activeCategory || undefined,
          search: query.trim() || undefined,
          sort: 'newest',
          limit: 8,
        }),
        getProductsRequest({ tag: 'POPULAR', limit: 6 }),
        // Optional: products tagged FEATURED. If it fails, we just fall back.
        getProductsRequest({ tag: 'FEATURED', limit: HERO_MAX }).catch(() => ({ data: [] })),
      ]);

      if (thisRequest !== requestId.current) return;

      // Hero source: FEATURED -> POPULAR -> newest arrivals
      const heroSource =
        (featuredRes.data?.length && featuredRes.data) ||
        (popularRes.data?.length && popularRes.data) ||
        arrivalsRes.data ||
        [];

      setArrivals(arrivalsRes.data.map(mapProduct));
      setPopularStyles(popularRes.data.map(mapStyle));
      setHeroSlides(heroSource.slice(0, HERO_MAX).map(mapHero));
      setHasData(true);
    } catch (e) {
      if (thisRequest !== requestId.current) return;
      setError(e instanceof ApiError ? e.message : 'Could not load products.');
    }
  }, [activeCategory, query]);

  /* ---- load wishlist ids ------------------------------------------------ */
  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }
    try {
      const res = await getWishlistRequest(token);
      if (wishlistPending.current.size > 0) return; // don't clobber an optimistic update in flight
      setWishlist((res.data?.products || []).map((p) => p._id));
    } catch {
      // non-fatal — hearts just start unfilled
    }
  }, [isAuthenticated, token]);

  /* ---- debounced re-fetch when search/category changes ------------------ */
  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return; }
    const handle = setTimeout(() => { load(); }, 350);
    return () => clearTimeout(handle);
  }, [query, activeCategory, load]);

  /* ---- refresh EVERY time this tab is focused --------------------------- */
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        (async () => {
          await Promise.all([load(), loadWishlist()]);
          setLoading(false);
        })();
      } else {
        Promise.all([load(), loadWishlist()]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  /* ---- hero auto-advance ------------------------------------------------ */
  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused) return;
    const timer = setTimeout(() => {
      const next = (heroIndex + 1) % heroSlides.length;
      heroRef.current?.scrollToOffset({ offset: next * heroStep, animated: true });
      setHeroIndex(next);
    }, HERO_INTERVAL);
    return () => clearTimeout(timer);
  }, [heroIndex, heroSlides.length, heroPaused, heroStep]);

  const onHeroScrollEnd = useCallback(
    (e) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / heroStep);
      setHeroIndex(Math.max(0, Math.min(i, heroSlides.length - 1)));
      setHeroPaused(false);
    },
    [heroStep, heroSlides.length]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadWishlist()]);
    setRefreshing(false);
  }, [load, loadWishlist]);

  const onRetry = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  /* ---- wishlist toggle (real API, optimistic) ------------------------- */
  const onToggleWishlist = useCallback(
    async (id) => {
      if (!isAuthenticated) {
        Alert.alert('Log in required', 'Log in to save items to your wishlist.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Log in', onPress: () => router.push('/(auth)/login') },
        ]);
        return;
      }

      if (wishlistPending.current.has(id)) return;
      wishlistPending.current.add(id);

      const next = !wishlist.includes(id);
      setWishlist((prev) => (next ? [...prev, id] : prev.filter((x) => x !== id)));

      try {
        if (next) await addToWishlistRequest(token, id);
        else await removeFromWishlistRequest(token, id);
      } catch (e) {
        setWishlist((prev) => (next ? prev.filter((x) => x !== id) : [...prev, id]));
        Alert.alert('Wishlist', e instanceof ApiError ? e.message : 'Could not update your wishlist.');
      } finally {
        wishlistPending.current.delete(id);
      }
    },
    [wishlist, isAuthenticated, token]
  );

  /* ---- navigation ------------------------------------------------------- */
  const goToProduct = useCallback(
    (id) => router.push({ pathname: '/Productdetails', params: { id } }),
    []
  );

  /* ---- render ----------------------------------------------------------- */

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.loader]} edges={[]}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.ink} />
        <Text style={styles.loaderText}>Loading today's picks</Text>
      </SafeAreaView>
    );
  }

  if (error && !hasData) {
    return (
      <SafeAreaView style={[styles.screen, styles.loader]} edges={[]}>
        <StatusBar style="dark" />
        <Ionicons name="cloud-offline-outline" size={28} color={C.muted} />
        <Text style={styles.loaderText}>{error}</Text>
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const activeDot = Math.min(heroIndex, heroSlides.length - 1);

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />
        }
      >
        {/* search */}
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Ionicons name="search" size={18} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search t-shirts, jackets, shirts..."
              placeholderTextColor={C.muted}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={C.muted} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={C.ink} />
          </Pressable>
        </View>

        {!!error && hasData && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} hitSlop={8}>
              <Text style={styles.errorRetry}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* categories */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          renderItem={({ item }) => {
            const active = item.id === activeCategory;
            return (
              <Pressable
                style={styles.cat}
                onPress={() => setActiveCategory((prev) => (prev === item.id ? null : item.id))}
              >
                <View style={[styles.catRing, active && styles.catRingActive]}>
                  <Image source={{ uri: item.image }} style={styles.catImage} />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />

        {/* hero carousel (hidden if there is nothing to show) */}
        {heroSlides.length > 0 && (
          <View>
            <FlatList
              ref={heroRef}
              data={heroSlides}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroStep}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.heroList}
              ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
              onScrollBeginDrag={() => setHeroPaused(true)}
              onScrollEndDrag={() => setHeroPaused(false)}
              onMomentumScrollEnd={onHeroScrollEnd}
              getItemLayout={(_, index) => ({
                length: heroStep,
                offset: heroStep * index,
                index,
              })}
              renderItem={({ item }) => (
                <HeroSlide item={item} width={heroWidth} onPress={() => goToProduct(item.id)} />
              )}
            />

            {heroSlides.length > 1 && (
              <View style={styles.heroDots}>
                {heroSlides.map((s, i) => (
                  <View key={s.id} style={[styles.heroDot, i === activeDot && styles.heroDotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* new arrivals */}
        <SectionHeader
          title="New Arrivals"
          subtitle="Refined proportions for everyday cadence"
          actionLabel="See all"
        />

        <View style={styles.grid}>
          {arrivals.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              width={cardWidth}
              wishlisted={wishlist.includes(item.id)}
              onToggleWishlist={() => onToggleWishlist(item.id)}
              onPressCard={() => goToProduct(item.id)}
            />
          ))}
          {arrivals.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {query ? `Nothing matches "${query}"` : 'No products found'}
              </Text>
              <Text style={styles.emptyBody}>Try a different fabric, colour or fit.</Text>
            </View>
          )}
        </View>

        {/* popular styles */}
        <SectionHeader title="Popular Styles" subtitle="Timeless essentials curated by demand" />

        <FlatList
          data={popularStyles}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularRow}
          renderItem={({ item }) => (
            <StyleCard
              item={item}
              width={width * 0.42}
              wishlisted={wishlist.includes(item.id)}
              onToggleWishlist={() => onToggleWishlist(item.id)}
              onPressCard={() => goToProduct(item.id)}
            />
          )}
        />

        {cartCount > 0 && (
          <Text style={styles.cartNote}>
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- pieces ------------------------------------------------------------- */

function HeroSlide({ item, width, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.heroSlide, { width }]}>
      <Image source={{ uri: item.image }} style={styles.heroImage} />
      <View style={styles.heroScrim} />
      <View style={styles.heroContent}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{item.label.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.heroBrand} numberOfLines={1}>{item.brand?.toUpperCase()}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.heroFoot}>
            <Text style={styles.heroPrice}>{formatPrice(item.price)}</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Shop now</Text>
              <Ionicons name="arrow-forward" size={14} color={C.ink} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, subtitle, actionLabel }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      </View>
      {!!actionLabel && (
        <Pressable hitSlop={8} style={styles.seeAll}>
          <Text style={styles.seeAllText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={C.ink} />
        </Pressable>
      )}
    </View>
  );
}

function ProductCard({ item, width, wishlisted, onToggleWishlist, onPressCard }) {
  const press = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(press, { toValue: v, useNativeDriver: true, friction: 7 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        onPress={onPressCard}
        style={[styles.card, { width }]}
      >
        <View style={styles.cardMedia}>
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          <HeartButton active={wishlisted} onPress={onToggleWishlist} />
          {item.isNew && (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>NEW</Text>
            </View>
          )}
          {item.rating != null && (
            <View style={styles.rating}>
              <Ionicons name="star" size={11} color={C.ink} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardBrand}>{item.brand.toUpperCase()}</Text>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardColor}>{item.color}</Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
            <Pressable style={styles.addBtn} onPress={onPressCard} hitSlop={6}>
              <Ionicons name="arrow-forward" size={16} color={C.ink} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function StyleCard({ item, width, wishlisted, onToggleWishlist, onPressCard }) {
  return (
    <Pressable style={[styles.card, { width }]} onPress={onPressCard}>
      <View style={[styles.cardMedia, { height: width * 1.25 }]}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <HeartButton active={wishlisted} onPress={onToggleWishlist} />
        {!!item.badge && (
          <View style={styles.sellerTag}>
            <Text style={styles.sellerTagText}>{item.badge.toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardFoot}>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <Pressable onPress={onPressCard} hitSlop={6}>
            <Ionicons name="arrow-forward" size={16} color={C.ink} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function HeartButton({ active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable style={styles.heart} onPress={handle} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={active ? 'heart' : 'heart-outline'}
          size={17}
          color={active ? '#E2445C' : C.ink}
        />
      </Animated.View>
    </Pressable>
  );
}

/* --- styles ------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loader: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  loaderText: { color: C.muted, fontSize: 13 },
  retryBtn: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: C.ink, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FCE9EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: '600' },
  errorRetry: { color: C.danger, fontSize: 12, fontWeight: '800' },

  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  searchField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 26, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0 },
  filterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  catRow: { paddingHorizontal: 16, paddingVertical: 18, gap: 18 },
  cat: { alignItems: 'center', width: 68 },
  catRing: { width: 62, height: 62, borderRadius: 31, padding: 2, borderWidth: 1.5, borderColor: 'transparent' },
  catRingActive: { borderColor: C.ink },
  catImage: { flex: 1, borderRadius: 29, backgroundColor: C.line },
  catLabel: { marginTop: 8, fontSize: 10, letterSpacing: 0.8, color: C.muted, fontWeight: '600' },
  catLabelActive: { color: C.ink },

  /* hero carousel */
  heroList: { paddingHorizontal: 16 },
  heroSlide: { height: HERO_HEIGHT, borderRadius: 18, overflow: 'hidden', backgroundColor: C.ink },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,17,21,0.38)' },
  heroContent: { flex: 1, justifyContent: 'space-between', padding: 18 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  heroBadgeText: { color: '#fff', fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  heroBrand: { color: 'rgba(255,255,255,0.8)', fontSize: 11, letterSpacing: 1.2, fontWeight: '700' },
  heroTitle: { color: '#fff', fontFamily: serif, fontSize: 24, lineHeight: 30, marginTop: 4, fontWeight: '600' },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  heroPrice: { color: '#fff', fontSize: 16, fontWeight: '700' },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  heroCtaText: { fontWeight: '700', fontSize: 13, color: C.ink },
  heroDots: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginTop: 12 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C8D0' },
  heroDotActive: { width: 18, backgroundColor: C.ink },

  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 30, marginBottom: 14 },
  sectionTitle: { fontFamily: serif, fontSize: 23, fontWeight: '700', color: C.ink },
  sectionSub: { fontSize: 12, color: C.muted, marginTop: 3 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
  cardMedia: { height: 210, backgroundColor: C.line },
  cardImage: { width: '100%', height: '100%' },
  heart: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  newTag: { position: 'absolute', top: 10, left: 10, backgroundColor: C.ink, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  newTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  sellerTag: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(15,17,21,0.72)', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  sellerTagText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  rating: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  ratingText: { fontSize: 11, fontWeight: '700', color: C.ink },
  cardBody: { padding: 12 },
  cardBrand: { fontSize: 9, letterSpacing: 0.9, color: C.muted, fontWeight: '700' },
  cardName: { fontSize: 14, fontWeight: '600', color: C.ink, marginTop: 5 },
  cardColor: { fontSize: 12, color: C.muted, marginTop: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  cardPrice: { fontSize: 16, fontWeight: '700', color: C.ink },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.chipBg, alignItems: 'center', justifyContent: 'center' },
  popularRow: { paddingHorizontal: 16, gap: 12 },
  cartNote: { textAlign: 'center', marginTop: 24, fontSize: 12, color: C.muted },
  empty: { paddingVertical: 34, alignItems: 'center', width: '100%' },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  emptyBody: { fontSize: 12, color: C.muted, marginTop: 5 },
});