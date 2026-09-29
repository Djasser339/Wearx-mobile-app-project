import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context'; // adjust path if this file lives elsewhere
import {
  ApiError,
  addToWishlistRequest,
  getProductByIdRequest,
  getWishlistRequest,
  removeFromWishlistRequest,
} from '../services/api'; // adjust path if needed

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CURRENCY = 'DA';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/700x900.png?text=No+Image';

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

// Mocked until the cart backend exists — same pattern as Explore's addToCart.
async function addToCartRequest(productId, qty, options) {
  await new Promise((r) => setTimeout(r, 300));
  return { productId, qty, options, ok: true };
}

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
  // Since this is a plain file (not a [id] dynamic route), the id arrives
  // as a normal query param. Navigate to this screen with:
  //   router.push({ pathname: '/productdetails', params: { id: productId } })
  const { id } = useLocalSearchParams();

  const { token, isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        setError(null);
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

  // Check whether this product is already in the user's wishlist.
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
    try {
      await addToCartRequest(product._id, qty, { color: selectedColor, size: selectedSize });
      Alert.alert('Added to bag', `${product.name} (x${qty}) was added to your bag.`);
    } catch {
      Alert.alert('Error', 'Could not add this item to your bag. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  }, [product, qty, selectedColor, selectedSize]);

  if (!id) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top']}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={28} color={C.muted} />
        <Text style={styles.errorText}>No product selected.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top']}>
        <StatusBar style="dark" />
        <ActivityIndicator color={C.ink} />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['top']}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={28} color={C.muted} />
        <Text style={styles.errorText}>{error || 'Product not found.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const images = product.images?.length ? product.images : [PLACEHOLDER_IMAGE];
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />

      {/* floating header */}
      <View style={styles.floatingHeader}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onToggleWishlist} hitSlop={8}>
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={20}
            color={wishlisted ? '#E2445C' : C.ink}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* image gallery */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.heroImage} />
          ))}
        </ScrollView>

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

      {/* fixed add-to-cart footer */}
      <View style={styles.footer}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  errorText: { color: C.muted, fontSize: 13, textAlign: 'center' },
  backBtn: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: C.ink, borderRadius: 20 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  floatingHeader: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.15, backgroundColor: C.line },

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
    padding: 16,
    paddingBottom: 28,
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