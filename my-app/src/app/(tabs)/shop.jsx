import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

/* =========================================================================
 *  DATA — swap for GET /api/products later
 * ========================================================================= */

const CATEGORIES = ['All', 'T-Shirts', 'Shirts', 'Pants', 'Shorts', 'Jackets', 'Shoes', 'Accessories'];

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36', '40', '41', '42', '43', '44', 'One size'];

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
const COLOR_NAMES = Object.keys(SWATCH);

const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 – $99', min: 50, max: 100 },
  { label: '$100 – $149', min: 100, max: 150 },
  { label: '$150 & up', min: 150, max: Infinity },
];

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'priceAsc', label: 'Price: Low to High' },
  { id: 'priceDesc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'newest', label: 'Newest' },
];

// Placeholder photos (re-used) — replace with your own product images.
const u = (id) => `https://images.unsplash.com/${id}?w=700&q=80`;
const IMG = {
  overshirt: u('photo-1608063615781-e2ef8c9d25d4'),
  bomber: u('photo-1551028719-00167b16eac5'),
  tee1: u('photo-1583743814966-8936f37f4678'),
  tee2: u('photo-1521572163474-6864f9cf17ab'),
  oxford: u('photo-1598033129183-c4f50c736f10'),
  shirt2: u('photo-1602810318383-e386cc2a3ccf'),
  chino: u('photo-1473966968600-fa801b869a1a'),
  pants2: u('photo-1594633312681-425c7b97ccd1'),
  shorts: u('photo-1591195853828-11db59a44f6b'),
  shoe1: u('photo-1549298916-b41d501d3772'),
  shoe2: u('photo-1542291026-7eec264c27ff'),
  knit: u('photo-1576871337622-98d48d1cf531'),
};

const P = (id, brand, name, category, price, colors, sizes, rating, reviews, tag, image) => ({
  id, brand, name, category, price, colors, sizes, rating, reviews, tag, image,
});

const LETTERS = ['S', 'M', 'L', 'XL'];

const PRODUCTS = [
  P('j1', 'Vanguard Studio', 'Minimalist Utility Overshirt', 'Jackets', 110, ['Olive', 'Black', 'Sand'], LETTERS, 4.8, 32, 'NEW', IMG.overshirt),
  P('j2', 'Tailoring', 'Structured Wool-Blend Bomber', 'Jackets', 165, ['Charcoal', 'Navy'], ['M', 'L', 'XL'], 4.9, 45, null, IMG.bomber),
  P('j3', 'Technical', 'Water-Resistant Shell Parka', 'Jackets', 195, ['Black'], ['M', 'L', 'XL', 'XXL'], 4.7, 19, 'POPULAR', IMG.bomber),
  P('j4', 'Denim Line', 'Denim Trucker Jacket', 'Jackets', 120, ['Blue', 'White'], ['S', 'M', 'L'], 4.6, 28, null, IMG.overshirt),
  P('j5', 'Essentials', 'Relaxed Coach Jacket', 'Jackets', 98, ['Stone', 'Black'], LETTERS, 4.8, 54, null, IMG.overshirt),
  P('j6', 'Active Craft', 'Technical Zip Windbreaker', 'Jackets', 88, ['Green', 'Navy'], ['M', 'L'], 4.5, 12, null, IMG.bomber),

  P('t1', 'Vanguard Core', 'Heavyweight Boxy Tee', 'T-Shirts', 48, ['Sand', 'Black', 'White'], LETTERS, 4.9, 120, 'POPULAR', IMG.tee1),
  P('t2', 'Essentials', 'Classic Crew Neck Tee', 'T-Shirts', 32, ['White', 'Black', 'Navy'], ['S', 'M', 'L', 'XL', 'XXL'], 4.6, 88, null, IMG.tee2),
  P('t3', 'Vanguard Studio', 'Pocket Linen Tee', 'T-Shirts', 42, ['Sand', 'Olive'], ['S', 'M', 'L'], 4.5, 17, 'NEW', IMG.tee1),

  P('s1', 'Tailored Atelier', 'Relaxed Oxford Cotton Shirt', 'Shirts', 78, ['Blue', 'White'], LETTERS, 4.7, 41, 'NEW', IMG.oxford),
  P('s2', 'Essentials', 'Linen Button-Down Shirt', 'Shirts', 68, ['Sand', 'White', 'Olive'], ['S', 'M', 'L'], 4.6, 23, null, IMG.shirt2),
  P('s3', 'Tailoring', 'Slim Poplin Shirt', 'Shirts', 72, ['White', 'Navy'], ['M', 'L', 'XL'], 4.4, 15, null, IMG.oxford),

  P('p1', 'Vanguard Studio', 'Pleated Straight-Leg Chino', 'Pants', 95, ['Charcoal', 'Sand'], ['30', '32', '34', '36'], 4.7, 36, null, IMG.chino),
  P('p2', 'Essentials', 'Tapered Cargo Pants', 'Pants', 85, ['Olive', 'Black'], ['30', '32', '34'], 4.5, 22, null, IMG.pants2),
  P('p3', 'Denim Line', 'Straight Selvedge Jeans', 'Pants', 115, ['Navy', 'Blue'], ['32', '34', '36'], 4.8, 30, 'POPULAR', IMG.pants2),

  P('h1', 'Vanguard Core', 'Tailored Linen Shorts', 'Shorts', 62, ['Sand', 'Navy'], LETTERS, 4.5, 26, null, IMG.shorts),
  P('h2', 'Active Craft', 'Technical Running Shorts', 'Shorts', 45, ['Black', 'Grey'], ['S', 'M', 'L'], 4.4, 14, null, IMG.shorts),

  P('f1', 'Footwear', 'Suede Runner Shoes', 'Shoes', 130, ['White', 'Sand'], ['40', '41', '42', '43', '44'], 4.7, 33, 'NEW', IMG.shoe1),
  P('f2', 'Footwear', 'Leather Court Sneakers', 'Shoes', 140, ['White', 'Black'], ['41', '42', '43'], 4.8, 47, null, IMG.shoe2),

  P('a1', 'Accessories', 'Ribbed Merino Beanie', 'Accessories', 45, ['Stone', 'Charcoal'], ['One size'], 4.6, 21, null, IMG.knit),
  P('a2', 'Accessories', 'Full-Grain Leather Belt', 'Accessories', 55, ['Brown', 'Black'], ['One size'], 4.7, 18, null, IMG.knit),
];

const EMPTY_FILTERS = { category: 'All', sizes: [], colors: [], price: null };
const PAGE_SIZE = 6;

const formatPrice = (v) => `$${Number(v).toFixed(2)}`;
const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const sizesFor = (category) =>
  SIZE_ORDER.filter((s) =>
    PRODUCTS.some((p) => (category === 'All' || p.category === category) && p.sizes.includes(s))
  );

const matches = (p, f, q) => {
  if (f.category !== 'All' && p.category !== f.category) return false;
  if (f.sizes.length && !f.sizes.some((s) => p.sizes.includes(s))) return false;
  if (f.colors.length && !f.colors.some((c) => p.colors.includes(c))) return false;
  if (f.price !== null) {
    const r = PRICE_RANGES[f.price];
    if (p.price < r.min || p.price >= r.max) return false;
  }
  if (q && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)) return false;
  return true;
};

const sortProducts = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case 'priceAsc': return arr.sort((a, b) => a.price - b.price);
    case 'priceDesc': return arr.sort((a, b) => b.price - a.price);
    case 'rating': return arr.sort((a, b) => b.rating - a.rating);
    case 'newest': return arr.sort((a, b) => (b.tag === 'NEW') - (a.tag === 'NEW'));
    default: return arr;
  }
};

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

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('featured');
  const [layout, setLayout] = useState('grid'); // 'grid' | 'list'
  const [wishlist, setWishlist] = useState(['j1']);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Lets Home open the Shop pre-filtered:
  // router.push({ pathname: '/(tabs)/shop', params: { category: 'Jackets' } })
  useEffect(() => {
    if (typeof params.category === 'string' && CATEGORIES.includes(params.category)) {
      setFilters((f) => ({ ...f, category: params.category }));
    }
  }, [params.category]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortProducts(PRODUCTS.filter((p) => matches(p, filters, q)), sort);
  }, [query, filters, sort]);

  // back to the first page whenever the result set changes
  useEffect(() => setVisibleCount(PAGE_SIZE), [query, filters, sort]);

  const visible = results.slice(0, visibleCount);
  const remaining = results.length - visible.length;

  const filterCount =
    (filters.sizes.length ? 1 : 0) + (filters.colors.length ? 1 : 0) + (filters.price !== null ? 1 : 0);

  const activeChips = [];
  if (filters.category !== 'All')
    activeChips.push({ key: 'cat', label: filters.category, clear: { category: 'All' } });
  if (filters.sizes.length)
    activeChips.push({ key: 'size', label: `Size: ${filters.sizes.join(', ')}`, clear: { sizes: [] } });
  if (filters.colors.length)
    activeChips.push({ key: 'color', label: `Color: ${filters.colors.join(', ')}`, clear: { colors: [] } });
  if (filters.price !== null)
    activeChips.push({ key: 'price', label: PRICE_RANGES[filters.price].label, clear: { price: null } });

  const toggleWishlist = (id) => setWishlist((prev) => toggleIn(prev, id));
  const openProduct = (id) => {
    // TODO: router.push(`/product/${id}`) once the product details screen exists
  };

  const cardWidth = layout === 'grid' ? (width - 32 - 12) / 2 : width - 32;
  const sortLabel = SORTS.find((s) => s.id === sort)?.label;

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
            CATEGORY  <Text style={styles.metaValue}>{filters.category}</Text>
          </Text>
          <Pressable style={styles.sortBtn} onPress={() => setSortOpen(true)} hitSlop={8}>
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
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={filters.category === c}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  category: c,
                  sizes: f.sizes.filter((s) => sizesFor(c).includes(s)),
                }))
              }
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
            <Pressable onPress={() => setFilters(EMPTY_FILTERS)} hitSlop={8}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* count + layout toggle */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>SHOWING {results.length} PRODUCTS</Text>
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
        {results.length > 0 ? (
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
            <Text style={styles.emptyBody}>Try a different search or remove some filters.</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => {
                setFilters(EMPTY_FILTERS);
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
            onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            <Text style={styles.loadMoreText}>
              Load {remaining} more{filters.category !== 'All' ? ` ${filters.category}` : ''}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.ink} />
          </Pressable>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        value={filters}
        query={query}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => setFilters(next)}
      />

      <SortSheet
        visible={sortOpen}
        value={sort}
        onClose={() => setSortOpen(false)}
        onSelect={setSort}
      />
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

function BottomSheet({ visible, onClose, title, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
              <Feather name="x" size={18} color={C.ink} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

function FilterSheet({ visible, value, query, onClose, onApply }) {
  const [draft, setDraft] = useState(value);

  // start from the applied filters every time the sheet opens
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible]);

  const availableSizes = sizesFor(draft.category);
  const count = PRODUCTS.filter((p) => matches(p, draft, query.trim().toLowerCase())).length;

  const setCategory = (c) =>
    setDraft((d) => ({
      ...d,
      category: c,
      sizes: d.sizes.filter((s) => sizesFor(c).includes(s)),
    }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={styles.sheetFoot}>
          <Pressable onPress={() => setDraft(EMPTY_FILTERS)} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
          <Pressable
            style={styles.applyBtn}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          >
            <Text style={styles.applyText}>Show {count} products</Text>
          </Pressable>
        </View>
      }
    >
      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.wrap}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={draft.category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>PRICE</Text>
      <View style={styles.wrap}>
        {PRICE_RANGES.map((r, i) => (
          <Chip
            key={r.label}
            label={r.label}
            active={draft.price === i}
            onPress={() => setDraft((d) => ({ ...d, price: d.price === i ? null : i }))}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>SIZE</Text>
      <View style={styles.wrap}>
        {availableSizes.map((s) => (
          <Chip
            key={s}
            label={s}
            active={draft.sizes.includes(s)}
            onPress={() => setDraft((d) => ({ ...d, sizes: toggleIn(d.sizes, s) }))}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>COLOR</Text>
      <View style={styles.wrap}>
        {COLOR_NAMES.map((name) => {
          const active = draft.colors.includes(name);
          return (
            <Pressable
              key={name}
              style={styles.swatchWrap}
              onPress={() => setDraft((d) => ({ ...d, colors: toggleIn(d.colors, name) }))}
            >
              <View style={[styles.swatchRing, active && styles.swatchRingActive]}>
                <View style={[styles.swatch, { backgroundColor: SWATCH[name] }]} />
              </View>
              <Text style={[styles.swatchLabel, active && { color: C.ink, fontWeight: '700' }]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function SortSheet({ visible, value, onClose, onSelect }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Sort by">
      {SORTS.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            style={styles.sortRow}
            onPress={() => {
              onSelect(s.id);
              onClose();
            }}
          >
            <Text style={[styles.sortText, active && { fontWeight: '700' }]}>{s.label}</Text>
            {active && <Feather name="check" size={18} color={C.ink} />}
          </Pressable>
        );
      })}
    </BottomSheet>
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

  /* bottom sheet */
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,17,21,0.45)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sheetTitle: { fontFamily: serif, fontSize: 21, fontWeight: '700', color: C.ink },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: C.muted,
    marginTop: 18,
    marginBottom: 10,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  swatchWrap: { width: 58, alignItems: 'center', gap: 5 },
  swatchRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingActive: { borderColor: C.ink },
  swatch: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  swatchLabel: { fontSize: 11, color: C.muted },

  sheetFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  resetText: { fontSize: 14, fontWeight: '600', color: C.body, textDecorationLine: 'underline' },
  applyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sortText: { fontSize: 15, color: C.ink },
});