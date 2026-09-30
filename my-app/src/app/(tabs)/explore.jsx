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
  countActiveFilters,
  resetFilters,
  setFilters,
  useFilters,
} from '../../context/filters-store';
import { CATEGORIES, CURRENCY, SORTS } from '../../constants/catalog';
import {
  ApiError,
  addToWishlistRequest,
  getBrandsRequest,
  getProductsRequest,
  getWishlistRequest,
  removeFromWishlistRequest,
} from '../../services/api';
import FilterModal from '../../components/filter-modal';

/* =========================================================================
 *  LOCAL CONTENT
 * ========================================================================= */

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';

const HERO_HEIGHT = 280;
const HERO_GAP = 12;
const HERO_PAD = 16; // horizontal padding of the hero list
const HERO_INTERVAL = 5000; // ms between auto-advances
const HERO_MAX = 5;

// Fake gradient: stacked bands, transparent at the top -> dark at the bottom.
const HERO_FADE_STEPS = 12;
const HERO_FADE_MAX = 0.78;
const HERO_FADE_BANDS = Array.from({ length: HERO_FADE_STEPS }, (_, i) => {
  const t = (i + 1) / HERO_FADE_STEPS;
  return `rgba(0,0,0,${(Math.pow(t, 1.4) * HERO_FADE_MAX).toFixed(3)})`;
});

const ALL_CATEGORY = { id: null, label: 'All' };

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
    description: p.description || '',
    category: p.category || '',
    price: p.price,
    tag: p.tag || null,
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
  };
}

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

function priceChipLabel(min, max) {
  if (min && max) return `${Number(min).toLocaleString('en-US')} – ${Number(max).toLocaleString('en-US')} ${CURRENCY}`;
  if (min) return `From ${Number(min).toLocaleString('en-US')} ${CURRENCY}`;
  return `Up to ${Number(max).toLocaleString('en-US')} ${CURRENCY}`;
}

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
  const heroWidth = width - HERO_PAD * 2;
  const heroStep = heroWidth + HERO_GAP;

  const { token, isAuthenticated } = useAuth();
  const { count: cartCount } = useCart();

  // filters live in a shared store so the /filters screen can edit them
  const filters = useFilters();
  const activeCategory = filters.category;
  const activeCount = countActiveFilters(filters);
  const [filterOpen, setFilterOpen] = useState(false);

  // Pre-fetch brands early in the background for zero-latency modal opening
  useEffect(() => {
    getBrandsRequest().catch(() => {});
  }, []);

  const [arrivals, setArrivals] = useState([]);
  const [popularStyles, setPopularStyles] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  const [query, setQuery] = useState('');
  const [wishlist, setWishlist] = useState([]);

  const isFiltering = activeCount > 0 || query.trim().length > 0;

  const requestId = useRef(0);
  const didMountSearch = useRef(false);
  const isFirstFocus = useRef(true);
  const wishlistPending = useRef(new Set());
  const heroRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  /* ---- load products ------------------------------------------------- */
  const load = useCallback(async () => {
    const thisRequest = ++requestId.current;
    const q = query.trim();
    const filtering =
      !!q || !!filters.category || !!filters.brand || !!filters.minPrice || !!filters.maxPrice || filters.sort !== 'newest';

    setFetching(true);
    try {
      setError(null);

      const arrivalsParams = {
        category: filters.category || undefined,
        search: q || undefined, // backend matches name OR brand
        brand: filters.brand || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        sort: filters.sort,
        limit: filtering ? 30 : 8,
      };

      // While searching/filtering we only need the results list.
      if (filtering) {
        const res = await getProductsRequest(arrivalsParams);
        if (thisRequest !== requestId.current) return;
        setArrivals(res.data.map(mapProduct));
        setTotal(res.total ?? res.data.length);
        setHasData(true);
        return;
      }

      const [arrivalsRes, popularRes, featuredRes, newRes] = await Promise.all([
        getProductsRequest(arrivalsParams),
        getProductsRequest({ tag: 'POPULAR', limit: 6 }),
        // Products tagged FEATURED
        getProductsRequest({ tag: 'FEATURED', limit: HERO_MAX }).catch(() => ({ data: [] })),
        // Products tagged NEW
        getProductsRequest({ tag: 'NEW', limit: HERO_MAX }).catch(() => ({ data: [] })),
      ]);

      if (thisRequest !== requestId.current) return;

      // Hero source: prioritize FEATURED and NEW tagged products, then POPULAR, then newest arrivals
      const candidateList = [
        ...(featuredRes.data || []),
        ...(newRes.data || []),
        ...(popularRes.data || []),
        ...(arrivalsRes.data || []),
      ];

      const seen = new Set();
      const heroSource = [];
      for (const p of candidateList) {
        if (p && p._id && !seen.has(p._id)) {
          seen.add(p._id);
          heroSource.push(p);
          if (heroSource.length >= HERO_MAX) break;
        }
      }

      setArrivals(arrivalsRes.data.map(mapProduct));
      setTotal(arrivalsRes.total ?? arrivalsRes.data.length);
      setPopularStyles(popularRes.data.map(mapStyle));
      setHeroSlides(heroSource.map(mapHero));
      setHasData(true);
    } catch (e) {
      if (thisRequest !== requestId.current) return;
      setError(e instanceof ApiError ? e.message : 'Could not load products.');
    } finally {
      if (thisRequest === requestId.current) setFetching(false);
    }
  }, [filters, query]);

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

  // Always-fresh references so the focus effect never runs a stale closure.
  const loadRef = useRef(load);
  const loadWishlistRef = useRef(loadWishlist);
  loadRef.current = load;
  loadWishlistRef.current = loadWishlist;

  /* ---- debounced re-fetch when search/filters change -------------------- */
  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return; }
    const handle = setTimeout(() => { load(); }, 350);
    return () => clearTimeout(handle);
  }, [load]);

  /* ---- refresh EVERY time this tab is focused --------------------------- */
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        (async () => {
          await Promise.all([loadRef.current(), loadWishlistRef.current()]);
          setLoading(false);
        })();
      } else {
        Promise.all([loadRef.current(), loadWishlistRef.current()]);
      }
    }, [])
  );

  /* ---- hero: live index from scroll position ---------------------------- */
  const onHeroScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / heroStep);
        const clamped = Math.max(0, Math.min(i, heroSlides.length - 1));
        setHeroIndex((prev) => (prev === clamped ? prev : clamped));
      },
    }
  );

  /* ---- hero: auto-advance (only scrolls; index comes from onScroll) ----- */
  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused) return;
    const timer = setTimeout(() => {
      const next = (heroIndex + 1) % heroSlides.length;
      heroRef.current?.scrollToOffset({ offset: next * heroStep, animated: true });
    }, HERO_INTERVAL);
    return () => clearTimeout(timer);
  }, [heroIndex, heroSlides.length, heroPaused, heroStep]);

  /* ---- hero: reset when slide count changes or the hero re-mounts ------- */
  useEffect(() => {
    setHeroIndex(0);
    scrollX.setValue(0);
    heroRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [heroSlides.length, isFiltering, scrollX]);

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

  /* ---- clearing ---------------------------------------------------------- */
  const clearAll = useCallback(() => {
    setQuery('');
    resetFilters();
  }, []);

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
  const openFilters = useCallback(() => setFilterOpen(true), []);

  /* ---- active filter chips (each one removable) ------------------------- */
  const chips = [];
  if (filters.category) {
    chips.push({ key: 'category', label: filters.category, onRemove: () => setFilters({ category: null }) });
  }
  if (filters.brand) {
    chips.push({ key: 'brand', label: filters.brand, onRemove: () => setFilters({ brand: null }) });
  }
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: 'price',
      label: priceChipLabel(filters.minPrice, filters.maxPrice),
      onRemove: () => setFilters({ minPrice: '', maxPrice: '' }),
    });
  }
  if (filters.sort !== 'newest') {
    chips.push({
      key: 'sort',
      label: SORTS.find((s) => s.id === filters.sort)?.label ?? filters.sort,
      onRemove: () => setFilters({ sort: 'newest' }),
    });
  }

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
              placeholder="Search by name or brand"
              placeholderTextColor={C.muted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {fetching && query.length > 0 && <ActivityIndicator size="small" color={C.muted} />}
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={C.muted} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.filterBtn} onPress={openFilters}>
            <Ionicons name="options-outline" size={20} color={C.ink} />
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
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
          data={[ALL_CATEGORY, ...CATEGORIES]}
          keyExtractor={(item) => item.id ?? 'all'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          renderItem={({ item }) => {
            const isAll = item.id === null;
            const active = item.id === activeCategory;
            return (
              <Pressable
                style={styles.cat}
                onPress={() =>
                  setFilters({ category: isAll || active ? null : item.id })
                }
              >
                <View style={[styles.catRing, active && styles.catRingActive]}>
                  {isAll ? (
                    <View style={[styles.catImage, styles.catAll]}>
                      <Ionicons name="grid-outline" size={22} color={C.ink} />
                    </View>
                  ) : (
                    <Image source={{ uri: item.image }} style={styles.catImage} />
                  )}
                  {active && !isAll && (
                    <View style={styles.catX}>
                      <Ionicons name="close" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />

        {/* active filters (tap x to remove one) + clear all */}
        {(chips.length > 0 || query.length > 0) && (
          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <Pressable key={c.key} style={styles.activeChip} onPress={c.onRemove} hitSlop={4}>
                <Text style={styles.activeChipText}>{c.label}</Text>
                <Ionicons name="close" size={13} color="#fff" />
              </Pressable>
            ))}
            <Pressable onPress={clearAll} style={styles.clearRow} hitSlop={6}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {/* hero carousel (hidden while searching/filtering or if empty) */}
        {!isFiltering && heroSlides.length > 0 && (
          <View>
            <Animated.FlatList
              ref={heroRef}
              data={heroSlides}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroStep}
              snapToAlignment="start"
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={onHeroScroll}
              removeClippedSubviews={false}
              contentContainerStyle={styles.heroList}
              ItemSeparatorComponent={() => <View style={{ width: HERO_GAP }} />}
              onScrollBeginDrag={() => setHeroPaused(true)}
              onScrollEndDrag={() => setHeroPaused(false)}
              onMomentumScrollEnd={() => setHeroPaused(false)}
              getItemLayout={(_, index) => ({
                length: heroStep,
                offset: HERO_PAD + heroStep * index,
                index,
              })}
              renderItem={({ item }) => (
                <HeroSlide item={item} width={heroWidth} onPress={() => goToProduct(item.id)} />
              )}
            />

            {heroSlides.length > 1 && (
              <View style={styles.heroDots}>
                {heroSlides.map((s, i) => {
                  const range = [(i - 1) * heroStep, i * heroStep, (i + 1) * heroStep];
                  const w = scrollX.interpolate({
                    inputRange: range,
                    outputRange: [6, 18, 6],
                    extrapolate: 'clamp',
                  });
                  const bg = scrollX.interpolate({
                    inputRange: range,
                    outputRange: ['#C4C8D0', C.ink, '#C4C8D0'],
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View
                      key={s.id}
                      style={[styles.heroDot, { width: w, backgroundColor: bg }]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* new arrivals / results */}
        {isFiltering ? (
          <SectionHeader
            title="Results"
            subtitle={`${total} ${total === 1 ? 'item' : 'items'} found`}
          />
        ) : (
          <SectionHeader
            title="New Arrivals"
            subtitle="Refined proportions for everyday cadence"
            actionLabel="See all"
          />
        )}

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
          {arrivals.length === 0 && !fetching && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {query ? `Nothing matches "${query}"` : 'No products found'}
              </Text>
              <Text style={styles.emptyBody}>Try a different name, brand or filter.</Text>
              {isFiltering && (
                <Pressable onPress={clearAll} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Clear search & filters</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* popular styles (hidden while searching/filtering) */}
        {!isFiltering && popularStyles.length > 0 && (
          <>
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
          </>
        )}

        {cartCount > 0 && (
          <Text style={styles.cartNote}>
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag
          </Text>
        )}
      </ScrollView>

      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </SafeAreaView>
  );
}

/* --- pieces ------------------------------------------------------------- */

function HeroSlide({ item, width, onPress }) {
  const [imgFailed, setImgFailed] = useState(false);
  const tagUpper = item.tag ? String(item.tag).toUpperCase() : '';

  return (
    <Pressable onPress={onPress} style={[styles.heroSlide, { width }]}>
      {/* 1. photo (render order = stacking order, no zIndex needed) */}
      {!imgFailed && (
        <Image
          source={{ uri: item.image }}
          style={styles.heroImage}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      )}

      {/* 2. soft gradient fade at the bottom so text is readable */}
      <View pointerEvents="none" style={styles.heroFade}>
        {HERO_FADE_BANDS.map((bg, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: bg }} />
        ))}
      </View>

      {/* 3. text + badges, always last so they sit on top */}
      <View style={styles.heroContent} pointerEvents="none">
        {/* Top badge + category pill */}
        <View style={styles.heroTopRow}>
          {tagUpper === 'FEATURED' ? (
            <View style={[styles.heroBadge, styles.heroBadgeFeatured]}>
              <Ionicons name="star" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>FEATURED</Text>
            </View>
          ) : tagUpper === 'NEW' ? (
            <View style={[styles.heroBadge, styles.heroBadgeNew]}>
              <Ionicons name="sparkles" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>NEW ARRIVAL</Text>
            </View>
          ) : tagUpper === 'POPULAR' ? (
            <View style={[styles.heroBadge, styles.heroBadgePopular]}>
              <Ionicons name="flame" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>TRENDING</Text>
            </View>
          ) : (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{item.category?.toUpperCase() || 'COLLECTION'}</Text>
            </View>
          )}

          {!!item.category && (
            <View style={styles.heroCatPill}>
              <Text style={styles.heroCatPillText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Product details at the bottom */}
        <View>
          <Text style={styles.heroBrand} numberOfLines={1}>
            {item.brand?.toUpperCase()}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.heroDescription} numberOfLines={2}>
            {item.description
              ? item.description
              : `Explore new season essentials from ${item.brand || 'top brands'}. Crafted with premium materials.`}
          </Text>
          <View style={styles.heroFoot}>
            <View>
              <Text style={styles.heroPriceLabel}>PRICE</Text>
              <Text style={styles.heroPrice}>{formatPrice(item.price)}</Text>
            </View>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Shop now</Text>
              <Ionicons name="arrow-forward" size={13} color={C.ink} />
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
  filterBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  catRow: { paddingHorizontal: 16, paddingVertical: 18, gap: 18 },
  cat: { alignItems: 'center', width: 68 },
  catRing: { width: 62, height: 62, borderRadius: 31, padding: 2, borderWidth: 1.5, borderColor: 'transparent' },
  catRingActive: { borderColor: C.ink },
  catImage: { flex: 1, borderRadius: 29, backgroundColor: C.line },
  catAll: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  catX: { position: 'absolute', top: -3, right: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  catLabel: { marginTop: 8, fontSize: 10, letterSpacing: 0.8, color: C.muted, fontWeight: '600' },
  catLabelActive: { color: C.ink },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.ink, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  activeChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clearRow: { paddingHorizontal: 6, paddingVertical: 7 },
  clearText: { color: C.danger, fontSize: 12, fontWeight: '700' },

  /* hero carousel */
  heroList: { paddingHorizontal: HERO_PAD },
  heroSlide: { height: HERO_HEIGHT, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2A2E36' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
    flexDirection: 'column',
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 18,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeFeatured: { backgroundColor: '#D97706' },
  heroBadgeNew: { backgroundColor: '#059669' },
  heroBadgePopular: { backgroundColor: '#DC2626' },
  heroBadgeText: { color: '#fff', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  heroCatPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroCatPillText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 9, letterSpacing: 0.8, fontWeight: '700' },
  heroBrand: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitle: {
    color: '#fff',
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 28,
    marginTop: 3,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  heroPriceLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 9, letterSpacing: 0.8, fontWeight: '700' },
  heroPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  heroCtaText: { fontWeight: '700', fontSize: 13, color: C.ink },
  heroDots: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 12 },
  heroDot: { height: 6, borderRadius: 3 },

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
  emptyBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: C.ink },
  emptyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});