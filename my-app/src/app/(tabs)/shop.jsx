import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CATEGORIES as PRODUCT_CATEGORIES, CURRENCY, SORTS as PRODUCT_SORTS } from '../../constants/catalog';
import { countActiveFilters, DEFAULT_FILTERS, resetFilters, setFilters, useFilters } from '../../context/filters-store';
import { useAuth } from '../../context/auth-context';
import { ApiError, addToWishlistRequest, getProductsRequest, getWishlistRequest, removeFromWishlistRequest } from '../../services/api';
import FilterModal from '../../components/filter-modal';

const SWATCH = {
  Black: '#111318',
  Charcoal: '#3A3D44',
  Grey: '#8A8F98',
  White: '#EDEAE4',
  Navy: '#1F2A44',
  Blue: '#3F6C9E',
  Green: '#7C9A85',
  Olive: '#5B6B3A',
  Sand: '#C9B98A',
  Stone: '#B8AFA0',
  Brown: '#7A5C46',
};
const PAGE_SIZE = 50;

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';
const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

const mapProduct = (product) => ({
  id: product._id,
  brand: product.brand || '',
  name: product.name || '',
  category: product.category || '',
  price: product.price,
  colors: product.colors || [],
  sizes: product.sizes || [],
  rating: Number(product.rating) || 0,
  reviews: Number(product.reviewCount) || 0,
  tag: product.tag || null,
  image: product.images?.[0] || PLACEHOLDER_IMAGE,
});

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
  chip: '#EEF0F8',
  sand: '#F1E4C8',
  heart: '#D62839',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/* =========================================================================
 *  SCREEN
 * ========================================================================= */

export default function Shop() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { token, isAuthenticated } = useAuth();
  const filters = useFilters();
  const filterCount = countActiveFilters(filters);
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState('grid'); // 'grid' | 'list'
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [wishlist, setWishlist] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const wishlistPending = useRef(new Set());

  useEffect(() => {
    const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
    if (typeof categoryParam === 'string' && PRODUCT_CATEGORIES.some((category) => category.id === categoryParam)) {
      setFilters({ category: categoryParam });
    }
  }, [params.category]);

  const loadProducts = useCallback(async (page = 1, append = false) => {
    const currentRequest = ++requestId.current;
    setFetching(true);
    try {
      setError(null);
      const result = await getProductsRequest({
        search: query.trim() || undefined,
        category: filters.category || undefined,
        brand: filters.brand || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        sizes: filters.sizes?.length ? filters.sizes : undefined,
        colors: filters.colors?.length ? filters.colors : undefined,
        sort: filters.sort,
        limit: 50,
        page,
      });
      if (currentRequest !== requestId.current) return;
      const mappedProducts = (result.data || []).map(mapProduct);
      setProducts((current) => append ? [...current, ...mappedProducts] : mappedProducts);
      if (append) setVisibleCount((current) => current + mappedProducts.length);
      setTotal(result.total ?? result.data?.length ?? 0);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError(requestError instanceof ApiError ? requestError.message : 'Could not load products.');
    } finally {
      if (currentRequest === requestId.current) {
        setFetching(false);
        setLoading(false);
      }
    }
  }, [filters, query]);

  const loadRef = useRef(loadProducts);
  loadRef.current = loadProducts;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    const timeout = setTimeout(() => loadProducts(1, false), 300);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  useFocusEffect(useCallback(() => {
    loadRef.current(1, false);
    return undefined;
  }, []));

  useEffect(() => {
    let alive = true;
    if (!isAuthenticated) {
      setWishlist([]);
      return undefined;
    }
    getWishlistRequest(token)
      .then((result) => {
        if (alive && wishlistPending.current.size === 0) {
          setWishlist((result.data?.products || []).map((product) => product._id));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isAuthenticated, token]);

  const visible = products.slice(0, visibleCount);
  const remaining = Math.max(total - visible.length, 0);
  const categoryLabel = PRODUCT_CATEGORIES.find((category) => category.id === filters.category)?.label || 'All';
  const sortLabel = PRODUCT_SORTS.find((option) => option.id === filters.sort)?.label || 'Newest';

  const toggleWishlist = async (id) => {
    if (!isAuthenticated) {
      Alert.alert('Log in required', 'Log in to save items to your wishlist.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log in', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    if (wishlistPending.current.has(id)) return;
    wishlistPending.current.add(id);
    const wasSaved = wishlist.includes(id);
    setWishlist((current) => wasSaved ? current.filter((itemId) => itemId !== id) : [...current, id]);
    try {
      if (wasSaved) await removeFromWishlistRequest(token, id);
      else await addToWishlistRequest(token, id);
    } catch (requestError) {
      setWishlist((current) => wasSaved ? [...current, id] : current.filter((itemId) => itemId !== id));
      Alert.alert('Wishlist', requestError instanceof ApiError ? requestError.message : 'Could not update your wishlist.');
    } finally {
      wishlistPending.current.delete(id);
    }
  };
  const openProduct = (id) => router.push({ pathname: '/Productdetails', params: { id } });

  const cardWidth = layout === 'grid' ? (width - 32 - 12) / 2 : width - 32;
  const activeChips = [
    ...(filters.category ? [{ key: 'category', label: categoryLabel, clear: { category: null } }] : []),
    ...(filters.brand ? [{ key: 'brand', label: filters.brand, clear: { brand: null } }] : []),
    ...(filters.sizes?.length ? [{ key: 'sizes', label: `Size: ${filters.sizes.join(', ')}`, clear: { sizes: [] } }] : []),
    ...(filters.colors?.length ? [{ key: 'colors', label: `Color: ${filters.colors.join(', ')}`, clear: { colors: [] } }] : []),
    ...((filters.minPrice || filters.maxPrice) ? [{ key: 'price', label: `${filters.minPrice || '0'} – ${filters.maxPrice || 'Any'} ${CURRENCY}`, clear: { minPrice: '', maxPrice: '' } }] : []),
    ...(filters.sort !== 'newest' ? [{ key: 'sort', label: sortLabel, clear: { sort: 'newest' } }] : []),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />

      {/* top block: search + category + sort + category chips */}
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search jackets, shirts, shoes..."
          />
          <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <Feather name="sliders" size={16} color={C.ink} />
            <Text style={styles.filterText}>Filters</Text>
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>
            CATEGORY  <Text style={styles.metaValue}>{categoryLabel}</Text>
          </Text>
          <Pressable style={styles.sortBtn} onPress={() => setFilterOpen(true)} hitSlop={8}>
            <Text style={styles.metaLabel}>
              Sort: <Text style={styles.metaValue}>{sortLabel}</Text>
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.ink} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {[{ id: null, label: 'All' }, ...PRODUCT_CATEGORIES].map((category) => (
            <Chip
              key={category.id || 'all'}
              label={category.label}
              active={filters.category === category.id}
              onPress={() => setFilters({ category: filters.category === category.id ? null : category.id })}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* active filters */}
        {activeChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeRow}
          >
            {activeChips.map((chip) => (
              <Pressable
                key={chip.key}
                style={styles.activeChip}
                onPress={() => setFilters((f) => ({ ...f, ...chip.clear }))}
              >
                <Text style={styles.activeChipText}>{chip.label}</Text>
                <Feather name="x" size={13} color={C.ink} />
              </Pressable>
            ))}
            <Pressable onPress={resetFilters} hitSlop={8}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* count + layout toggle */}
        <View style={styles.countRow}>
            <Text style={styles.countText}>SHOWING {total} PRODUCTS</Text>
          <View style={styles.toggle}>
            <Pressable onPress={() => setLayout('grid')} hitSlop={8}>
              <Feather name="grid" size={18} color={layout === 'grid' ? C.ink : C.muted} />
            </Pressable>
            <Pressable onPress={() => setLayout('list')} hitSlop={8}>
              <Feather name="list" size={19} color={layout === 'list' ? C.ink : C.muted} />
            </Pressable>
          </View>
        </View>

        {/* products */}
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={C.ink} /></View>
        ) : error && products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Could not load products</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable style={styles.emptyBtn} onPress={() => loadProducts()}><Text style={styles.emptyBtnText}>Try again</Text></Pressable>
          </View>
        ) : visible.length > 0 ? (
          <View style={styles.grid}>
            {visible.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                width={cardWidth}
                layout={layout}
                wishlisted={wishlist.includes(item.id)}
                onToggleWishlist={() => toggleWishlist(item.id)}
                onPress={() => openProduct(item.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="search" size={24} color={C.ink} />
            </View>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyBody}>{error || 'Try a different search or remove some filters.'}</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => {
                resetFilters();
                setQuery('');
              }}
            >
              <Text style={styles.emptyBtnText}>Clear filters</Text>
            </Pressable>
          </View>
        )}

        {remaining > 0 && (
          <Pressable
            style={styles.loadMore}
            onPress={() => {
              loadProducts(Math.floor(products.length / 50) + 1, true);
            }}
          >
            <Text style={styles.loadMoreText}>
              {fetching ? 'Loading...' : `Load ${remaining} more${filters.category ? ` ${categoryLabel}` : ''}`}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.ink} />
          </Pressable>
        )}
      </ScrollView>

      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </SafeAreaView>
  );
}

/* =========================================================================
 *  REUSABLE PIECES
 * ========================================================================= */

function SearchBar({ value, onChange, placeholder }) {
  return (
    <View style={styles.searchField}>
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={C.muted} />
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ColorDot({ name, size = 10 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: SWATCH[name],
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
      }}
    />
  );
}

function HeartButton({ active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handle = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 110, useNativeDriver: true }),
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
          color={active ? C.heart : C.ink}
        />
      </Animated.View>
    </Pressable>
  );
}

function ProductCard({ item, width, layout, wishlisted, onToggleWishlist, onPress }) {
  const imgW = width - 16;
  const imgH = layout === 'grid' ? imgW * 1.3 : imgW * 0.9;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.media, { height: imgH }]}>
        <Image source={{ uri: item.image }} style={styles.mediaImg} />
        <HeartButton active={wishlisted} onPress={onToggleWishlist} />
        {!!item.tag && (
          <View style={[styles.tag, item.tag === 'NEW' ? styles.tagDark : styles.tagSand]}>
            <Text style={[styles.tagText, { color: item.tag === 'NEW' ? '#fff' : C.body }]}>
              {item.tag}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dots}>
          {item.colors.map((c) => (
            <ColorDot key={c} name={c} />
          ))}
        </View>
        <Text style={styles.brand}>{item.brand.toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.cardFoot}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={C.ink} />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} <Text style={{ color: C.muted }}>({item.reviews})</Text>
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* =========================================================================
 *  STYLES
 * ========================================================================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  top: { backgroundColor: C.surface, paddingTop: 12, paddingBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    backgroundColor: C.chip,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    backgroundColor: C.chip,
  },
  filterText: { fontSize: 14, fontWeight: '700', color: C.ink },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  metaLabel: { fontSize: 12, letterSpacing: 1, color: C.muted },
  metaValue: { fontSize: 14, fontWeight: '700', letterSpacing: 0, color: C.ink },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  catRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: C.body },
  chipTextActive: { color: '#fff' },

  activeRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.chip,
  },
  activeChipText: { fontSize: 12, fontWeight: '600', color: C.ink },
  clearText: { fontSize: 12, color: C.muted, textDecorationLine: 'underline', marginLeft: 4 },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  countText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.3, color: C.body },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 8 },
  media: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.line },
  mediaImg: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagDark: { backgroundColor: C.ink },
  tagSand: { backgroundColor: C.sand },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },

  cardBody: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4 },
  dots: { flexDirection: 'row', gap: 5 },
  brand: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: C.muted, marginTop: 8 },
  name: { fontFamily: serif, fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4 },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontSize: 15, fontWeight: '700', color: C.ink },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '600', color: C.body },

  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 22,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 23,
    backgroundColor: C.surface,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: C.ink },

  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 14 },
  emptyBody: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
  emptyBtn: {
    marginTop: 18,
    backgroundColor: C.ink,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

});