import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

/* =========================================================================
 *  DATA — swap for real API data later
 * ========================================================================= */

const AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80';

const PRODUCTS = [
  {
    id: 'w1',
    brand: 'Vanguard Lab',
    name: 'Utility Overshirt',
    color: 'Forest Olive',
    size: 'Size M',
    price: 110,
    tag: { label: 'NEW IN', tone: 'dark' },
    image: 'https://images.unsplash.com/photo-1608063615781-e2ef8c9d25d4?w=700&q=80',
  },
  {
    id: 'w2',
    brand: 'Essential',
    name: 'Oxford Cotton Shirt',
    color: 'Sky Blue',
    size: 'Size L',
    price: 78,
    tag: { label: 'ORGANIC', tone: 'sand' },
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=700&q=80',
  },
  {
    id: 'w3',
    brand: 'Footwear',
    name: 'Suede Runner Shoes',
    color: 'Off-White',
    size: 'Size 42',
    price: 130,
    tag: null,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700&q=80',
  },
  {
    id: 'w4',
    brand: 'Heavyweight',
    name: 'Heavyweight Boxy Tee',
    color: 'Warm Sand',
    size: 'Size M',
    price: 48,
    tag: null,
    image: 'https://images.unsplash.com/photo-1583743814966-8936f37f4678?w=700&q=80',
  },
  {
    id: 'r1',
    brand: 'Tailoring',
    name: 'Pleated Wool Trousers',
    color: 'Charcoal',
    size: 'Size 32',
    price: 145,
    tag: null,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=700&q=80',
  },
  {
    id: 'r2',
    brand: 'Accessories',
    name: 'Ribbed Merino Beanie',
    color: 'Oatmeal',
    size: 'One size',
    price: 45,
    tag: null,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=700&q=80',
  },
];

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const INITIAL_WISHLIST = ['w1', 'w2', 'w3', 'w4'];
const RECENT_IDS = ['r1', 'r2'];

const formatPrice = (v) => `$${Number(v).toFixed(2)}`;

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
  chipText: '#5B6480',
  banner: '#EAEEFA',
  sand: '#F1E4C8',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/* =========================================================================
 *  SCREEN
 * ========================================================================= */

export default function Wishlist() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 16 * 2 - 12) / 2;

  const [ids, setIds] = useState(INITIAL_WISHLIST);
  const [previewEmpty, setPreviewEmpty] = useState(false); // demo toggle for the empty state

  const toggle = (id) =>
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));

  const items = previewEmpty ? [] : ids.map((id) => byId[id]);
  const count = items.length;

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />

      


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Wishlist</Text>
          <View style={styles.countChip}>
            <Text style={styles.countText}>
              {count} {count === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* shipping banner */}
        <View style={styles.banner}>
          <Feather name="truck" size={20} color={C.body} />
          <Text style={styles.bannerText}>
            Complimentary express shipping on orders over $150
          </Text>
          <Pressable onPress={() => setPreviewEmpty((v) => !v)} hitSlop={8}>
            <Text style={styles.bannerAction}>
              {previewEmpty ? 'SHOW\nITEMS' : 'PREVIEW\nEMPTY'}
            </Text>
          </Pressable>
        </View>

        {/* wishlist grid / empty state */}
        {count > 0 ? (
          <View style={styles.grid}>
            {items.map((item) => (
              <WishCard
                key={item.id}
                item={item}
                width={cardWidth}
                onToggle={() => toggle(item.id)}
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

        {/* recently viewed */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={styles.eyebrow}>CONTINUE EXPLORING</Text>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
          </View>
          <Pressable hitSlop={8} style={styles.viewAll}>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
            <Ionicons name="chevron-forward" size={14} color={C.ink} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {RECENT_IDS.map((id) => (
            <RecentCard
              key={id}
              item={byId[id]}
              width={cardWidth}
              wishlisted={ids.includes(id)}
              onToggle={() => toggle(id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================================
 *  PIECES
 * ========================================================================= */

function WishCard({ item, width, onToggle }) {
  const imgW = width - 20;
  return (
    <View style={[styles.card, { width }]}>
      <View style={[styles.media, { height: imgW * 1.32 }]}>
        <Image source={{ uri: item.image }} style={styles.mediaImg} />
        <HeartButton active onPress={onToggle} size={36} />
        {item.tag && (
          <View style={[styles.tag, item.tag.tone === 'dark' ? styles.tagDark : styles.tagSand]}>
            <Text
              style={[styles.tagText, { color: item.tag.tone === 'dark' ? '#fff' : C.body }]}
            >
              {item.tag.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.brandLabel} numberOfLines={1}>
            {item.brand.toUpperCase()}
          </Text>
          <Text style={styles.sizeLabel}>{item.size}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.color}>{item.color}</Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
      </View>
    </View>
  );
}

function RecentCard({ item, width, wishlisted, onToggle }) {
  const imgW = width - 20;
  return (
    <View style={[styles.card, { width }]}>
      <View style={[styles.media, { height: imgW * 1.32 }]}>
        <Image source={{ uri: item.image }} style={styles.mediaImg} />
        <HeartButton active={wishlisted} onPress={onToggle} size={32} />
      </View>
      <View style={styles.body}>
        <Text style={styles.brandLabel}>{item.brand.toUpperCase()}</Text>
        <Text style={[styles.name, { fontSize: 15 }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
      </View>
    </View>
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
        <Ionicons
          name={active ? 'heart' : 'heart-outline'}
          size={size * 0.5}
          color={C.ink}
        />
      </Animated.View>
    </Pressable>
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
    paddingBottom: 12,
    backgroundColor: C.surface,
  },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  brand: { fontSize: 19, fontWeight: '800', letterSpacing: 1.5, color: C.ink },
  brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C9B79A', marginBottom: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D62839',
  },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.line },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 22,
  },
  title: { fontFamily: serif, fontSize: 34, fontWeight: '700', color: C.ink },
  countChip: {
    backgroundColor: C.chipBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
  },
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
  bannerAction: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 17,
  },

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
  tag: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagDark: { backgroundColor: C.ink },
  tagSand: { backgroundColor: C.sand },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  body: { paddingTop: 12, paddingHorizontal: 2, paddingBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  brandLabel: { flexShrink: 1, fontSize: 11, fontWeight: '600', letterSpacing: 1.1, color: C.body },
  sizeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.body },
  name: { fontFamily: serif, fontSize: 17, color: C.ink, marginTop: 8 },
  color: { fontFamily: serif, fontSize: 14, color: C.muted, marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 14 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 36,
    marginBottom: 14,
  },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, color: C.body },
  sectionTitle: { fontFamily: serif, fontSize: 23, fontWeight: '700', color: C.ink, marginTop: 2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 4 },
  viewAllText: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: C.body },

  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: serif, fontSize: 21, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: C.ink,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});