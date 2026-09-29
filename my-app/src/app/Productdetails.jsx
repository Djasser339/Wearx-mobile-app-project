import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context';
import { useCart } from '../context/cart-context';
import {
  ApiError,
  addToWishlistRequest,
  getProductByIdRequest,
  getWishlistRequest,
  removeFromWishlistRequest,
} from '../services/api';

const CURRENCY = 'DA';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

const C = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  line: '#ECEEF1',
  chipBg: '#EDF0FA',
  danger: '#C1272D',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { token, isAuthenticated } = useAuth();
  const { addItem, count: cartCount } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  /* ---- load product ---------------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getProductByIdRequest(id);
        if (!alive) return;
        setProduct(res.data);
        if (res.data.colors?.length) setSelectedColor(res.data.colors[0]);
        if (res.data.sizes?.length) setSelectedSize(res.data.sizes[0]);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Could not load this product.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  /* ---- wishlist state -------------------------------------------------- */
  useEffect(() => {
    let alive = true;
    if (!isAuthenticated || !id) {
      setWishlisted(false);
      return;
    }
    (async () => {
      try {
        const res = await getWishlistRequest(token);
        if (!alive) return;
        const ids = (res.data?.products || []).map((p) => p._id);
        setWishlisted(ids.includes(id));
      } catch {
        // non-fatal
      }
    })();
    return () => { alive = false; };
  }, [id, isAuthenticated, token]);

  const onToggleWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Log in required', 'Log in to save items to your wishlist.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Log in', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    if (wishlistBusy) return;
    setWishlistBusy(true);

    const next = !wishlisted;
    setWishlisted(next); // optimistic

    try {
      if (next) await addToWishlistRequest(token, id);
      else await removeFromWishlistRequest(token, id);
    } catch (e) {
      setWishlisted(!next); // rollback
      Alert.alert('Wishlist', e instanceof ApiError ? e.message : 'Could not update your wishlist.');
    } finally {
      setWishlistBusy(false);
    }
  }, [isAuthenticated, wishlisted, wishlistBusy, token, id]);

  /* ---- add to cart (real, via CartContext) ----------------------------- */
  const onAddToCart = useCallback(async () => {
    if (!product) return;

    if (product.colors?.length && !selectedColor) {
      Alert.alert('Select a color', 'Please choose a color before adding to your bag.');
      return;
    }
    if (product.sizes?.length && !selectedSize) {
      Alert.alert('Select a size', 'Please choose a size before adding to your bag.');
      return;
    }

    setAddingToCart(true);
    // addItem never throws: it shows its own error alert and returns { ok: false }
    const res = await addItem(product, qty, { size: selectedSize, color: selectedColor });
    setAddingToCart(false);

    if (res?.ok) {
      Alert.alert('Added to bag', `${product.name} (x${qty}) was added to your bag.`, [
        { text: 'Keep shopping', style: 'cancel' },
        { text: 'View bag', onPress: () => router.push('/(tabs)/cart') },
      ]);
    }
  }, [product, qty, selectedColor, selectedSize, addItem]);

  /* ---- shared header (used in every state) ----------------------------- */
  const header = (showActions) => (
    <View style={[styles.floatingHeader, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={C.ink} />
      </Pressable>

      {showActions && (
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={onToggleWishlist} hitSlop={8}>
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={wishlisted ? '#E2445C' : C.ink}
            />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/cart')} hitSlop={8}>
            <Feather name="shopping-bag" size={18} color={C.ink} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );

  /* ---- states ---------------------------------------------------------- */
  if (!id) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="dark" />
        {header(false)}
        <Ionicons name="alert-circle-outline" size={28} color={C.muted} />
        <Text style={styles.errorText}>No product selected.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="dark" />
        {header(false)}
        <ActivityIndicator color={C.ink} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="dark" />
        {header(false)}
        <Ionicons name="alert-circle-outline" size={28} color={C.muted} />
        <Text style={styles.errorText}>{error || 'Product not found.'}</Text>
      </View>
    );
  }

  const images = product.images?.length ? product.images : [PLACEHOLDER_IMAGE];
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* image gallery (full-bleed, header floats on top) */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width, height: width * 1.15, backgroundColor: C.line }}
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand?.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.rating > 0 && (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={13} color={C.ink} />
                <Text style={styles.ratingText}>
                  {product.rating.toFixed(1)}
                  {product.reviewCount > 0 ? ` (${product.reviewCount})` : ''}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.stockText, outOfStock && { color: C.danger }]}>
            {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </Text>

          {!!product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {/* colors */}
          {product.colors?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>COLOR</Text>
              <View style={styles.chipRow}>
                {product.colors.map((c) => {
                  const active = c === selectedColor;
                  return (
                    <Pressable
                      key={c}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedColor(c)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* sizes */}
          {product.sizes?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SIZE</Text>
              <View style={styles.chipRow}>
                {product.sizes.map((s) => {
                  const active = s === selectedSize;
                  return (
                    <Pressable
                      key={s}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedSize(s)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <View style={styles.qtyRow}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                hitSlop={8}
              >
                <Ionicons name="remove" size={18} color={C.ink} />
              </Pressable>
              <Text style={styles.qtyText}>{qty}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
                hitSlop={8}
              >
                <Ionicons name="add" size={18} color={C.ink} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* floating header, positioned below the status bar / notch */}
      {header(true)}

      {/* fixed add-to-cart footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <Pressable
          style={[styles.addToCartBtn, (outOfStock || addingToCart) && styles.addToCartBtnDisabled]}
          onPress={onAddToCart}
          disabled={outOfStock || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addToCartText}>
              {outOfStock ? 'Out of stock' : `Add to Bag · ${formatPrice(product.price * qty)}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  errorText: { color: C.muted, fontSize: 13, textAlign: 'center' },

  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  dots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 18, backgroundColor: '#fff' },

  content: { padding: 16 },
  brand: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.muted },
  name: { fontFamily: serif, fontSize: 24, fontWeight: '700', color: C.ink, marginTop: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  price: { fontSize: 20, fontWeight: '700', color: C.ink },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.chipBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: C.ink },

  stockText: { fontSize: 12, color: C.muted, marginTop: 8, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 21, color: C.body, marginTop: 16 },

  section: { marginTop: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.muted, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: C.ink },
  chipTextActive: { color: '#fff' },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', color: C.ink, minWidth: 20, textAlign: 'center' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  addToCartBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartBtnDisabled: { backgroundColor: C.muted },
  addToCartText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});