import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useCart } from '../../context/cart-context';
import { useCallback } from 'react';

const FREE_SHIPPING_MIN = 15000; // DA — adjust to your real threshold
const SHIPPING_FEE = 500;
const PROMO_CODE = 'WEARX10';
const PROMO_RATE = 0.1;
const CURRENCY = 'DA';

const formatPrice = (v) => `${Number(v).toLocaleString('en-US')} ${CURRENCY}`;

const C = {
  bg: '#F5F6F8', surface: '#FFFFFF', ink: '#0F1115', body: '#3B4049', muted: '#8B929C',
  line: '#ECEEF1', chip: '#F1F2F5', chipBlue: '#E6EAF8', green: '#0F7B55', danger: '#C1272D',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const { items, count, loading, changeQty, removeItem, clear, refresh } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const isFirstFocus = useRef(true);

  // Refresh every time the Cart tab gains focus — first time is covered by
  // the context's own initial load, later focuses catch stock/price changes
  // or items added from Explore/Shop/Product Details.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const clearAll = () =>
    Alert.alert('Clear bag', 'Remove every item from your bag?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);

  const applyPromo = () => {
    if (promoInput.trim().toUpperCase() === PROMO_CODE) {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoApplied(false);
      setPromoError('That code is not valid.');
    }
  };

  const { subtotal, discount, shipping, total } = useMemo(() => {
    const subtotal = items.reduce((n, it) => n + it.price * it.qty, 0);
    const discount = promoApplied ? subtotal * PROMO_RATE : 0;
    const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
    return { subtotal, discount, shipping, total: subtotal - discount + shipping };
  }, [items, promoApplied]);

  const remaining = Math.max(0, FREE_SHIPPING_MIN - subtotal);
  const progress = Math.min(1, subtotal / FREE_SHIPPING_MIN);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={[]}>
        <StatusBar style="dark" />
        <View style={styles.emptyIcon}>
          <Feather name="shopping-bag" size={24} color={C.ink} />
        </View>
        <Text style={styles.emptyTitle}>Log in to see your bag</Text>
        <Text style={styles.emptyBody}>Your cart is tied to your account.</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.emptyBtnText}>Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={[]}>
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
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.muted} />}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.title}>Shopping Bag</Text>
            <View style={styles.countChip}>
              <Text style={styles.countText}>{count} {count === 1 ? 'item' : 'items'}</Text>
            </View>
          </View>
          {items.length > 0 && (
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="shopping-bag" size={24} color={C.ink} />
            </View>
            <Text style={styles.emptyTitle}>Your bag is empty</Text>
            <Text style={styles.emptyBody}>Items you add to your bag will show up here.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.emptyBtnText}>Browse new arrivals</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.shipCard}>
              <View style={styles.shipTop}>
                <View style={styles.shipIcon}>
                  <Feather name="truck" size={15} color={C.ink} />
                </View>
                <Text style={styles.shipText}>
                  {remaining > 0
                    ? `Add ${formatPrice(remaining)} more for free shipping`
                    : 'You have unlocked free shipping'}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: remaining > 0 ? C.ink : C.green }]} />
              </View>
            </View>

            <View style={styles.list}>
              {items.map((item) => (
                <CartRow
                  key={item.key}
                  item={item}
                  onMinus={() => changeQty(item.key, -1)}
                  onPlus={() => changeQty(item.key, 1)}
                  onRemove={() => removeItem(item.key)}
                />
              ))}
            </View>

            <View style={styles.promoCard}>
              <View style={styles.promoRow}>
                <Feather name="tag" size={16} color={C.muted} />
                <TextInput
                  value={promoInput}
                  onChangeText={(t) => { setPromoInput(t); setPromoError(''); }}
                  placeholder="Promo code or gift voucher"
                  placeholderTextColor={C.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.promoInput}
                  returnKeyType="done"
                  onSubmitEditing={applyPromo}
                />
                <Pressable style={styles.applyBtn} onPress={applyPromo} hitSlop={6}>
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>
              {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
              {promoApplied && <Text style={styles.promoOk}>{PROMO_CODE} applied: 10% off your order</Text>}
            </View>

            <View style={styles.summary}>
              <Line label="Subtotal" value={formatPrice(subtotal)} />
              {promoApplied && <Line label="Discount" value={`-${formatPrice(discount)}`} accent />}
              <Line label="Shipping" value={shipping === 0 ? 'Free' : formatPrice(shipping)} accent={shipping === 0} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.checkoutBar}>
          <Pressable
            style={({ pressed }) => [styles.checkout, pressed && { opacity: 0.88 }]}
            onPress={() => router.push({ pathname: '/checkout', params: { promoCode: promoApplied ? PROMO_CODE : '' } })}
          >
            <Text style={styles.checkoutText}>Checkout  •  {formatPrice(total)}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function CartRow({ item, onMinus, onPlus, onRemove }) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: item.image }} style={styles.thumb} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.brandLabel} numberOfLines={1}>{item.brand?.toUpperCase()}</Text>
          <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
            <Feather name="x" size={14} color={C.body} />
          </Pressable>
        </View>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        {(item.color || item.size) && (
          <View style={styles.metaRow}>
            {!!item.color && <Text style={styles.meta}>{item.color}</Text>}
            {item.color && item.size && <View style={styles.metaDot} />}
            {!!item.size && <Text style={styles.meta}>Size {item.size}</Text>}
          </View>
        )}
        <View style={styles.rowBottom}>
          <View style={styles.stepper}>
            <Pressable onPress={onMinus} hitSlop={8} disabled={item.qty <= 1}>
              <Feather name="minus" size={15} color={item.qty <= 1 ? '#C4C8D0' : C.ink} />
            </Pressable>
            <Text style={styles.qty}>{item.qty}</Text>
            <Pressable onPress={onPlus} hitSlop={8}>
              <Feather name="plus" size={15} color={C.ink} />
            </Pressable>
          </View>
          <Text style={styles.price}>{formatPrice(item.price * item.qty)}</Text>
        </View>
      </View>
    </View>
  );
}

function Line({ label, value, accent }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, accent && { color: C.green, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: serif, fontSize: 24, fontWeight: '700', color: C.ink },
  countChip: { backgroundColor: C.chipBlue, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 4 },
  countText: { fontSize: 11, fontWeight: '600', color: '#5B6480' },
  clearAll: { fontSize: 12, fontWeight: '600', color: C.muted, textDecorationLine: 'underline' },

  shipCard: { marginHorizontal: 16, marginTop: 14, padding: 14, backgroundColor: C.surface, borderRadius: 14 },
  shipTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shipIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.chipBlue, alignItems: 'center', justifyContent: 'center' },
  shipText: { flex: 1, fontFamily: serif, fontSize: 13, color: C.body },
  track: { height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

  list: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: C.surface, borderRadius: 16 },
  thumb: { width: 84, height: 108, borderRadius: 12, backgroundColor: C.line },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLabel: { flexShrink: 1, fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: C.muted },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.chip, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: serif, fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  meta: { fontFamily: serif, fontSize: 12, color: C.muted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C4C8D0' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 88, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.chip },
  qty: { fontSize: 13, fontWeight: '700', color: C.ink },
  price: { fontFamily: serif, fontSize: 16, fontWeight: '700', color: C.ink },

  promoCard: { marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: C.surface, borderRadius: 14 },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoInput: { flex: 1, fontSize: 13, color: C.ink, padding: 0, height: 32 },
  applyBtn: { backgroundColor: C.ink, borderRadius: 16, paddingHorizontal: 16, height: 32, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  promoError: { marginTop: 8, fontSize: 11.5, color: C.danger },
  promoOk: { marginTop: 8, fontSize: 11.5, color: C.green },

  summary: { marginHorizontal: 16, marginTop: 12, padding: 16, gap: 11, backgroundColor: C.surface, borderRadius: 16 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel: { fontSize: 13, color: C.body },
  lineValue: { fontSize: 13, color: C.ink },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  totalLabel: { fontFamily: serif, fontSize: 16, fontWeight: '700', color: C.ink },
  totalValue: { fontFamily: serif, fontSize: 22, fontWeight: '800', color: C.ink },

  checkoutBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line },
  checkout: { height: 50, borderRadius: 25, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  checkoutText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },

  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 14 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: C.muted, textAlign: 'center', marginTop: 6 },
  emptyBtn: { marginTop: 18, backgroundColor: C.ink, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});