import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context';
import { getMyOrdersRequest } from '../services/api';

const CURRENCY = 'DA';
const formatPrice = (value) => `${Number(value || 0).toLocaleString('en-US')} ${CURRENCY}`;
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const STATUS_COLORS = {
  pending: { background: '#F4EBD8', text: '#815C16' },
  confirmed: { background: '#E6EAF8', text: '#48547E' },
  shipped: { background: '#E3EFF8', text: '#35627F' },
  delivered: { background: '#DDF3E9', text: '#0F7B55' },
  cancelled: { background: '#FCE9EB', text: '#C1272D' },
};

const C = {
  bg: '#F5F6F8', surface: '#FFFFFF', ink: '#0F1115', body: '#3B4049', muted: '#8B929C',
  line: '#ECEEF1', danger: '#C1272D',
};

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setError('');
      const response = await getMyOrdersRequest(token);
      setOrders(response.data || []);
    } catch (requestError) {
      setError(requestError?.message || 'We could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadOrders();
  }, [loadOrders]));

  const refresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={21} color={C.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.headerTitle}>My orders</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>{orders.length}</Text></View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={C.ink} /></View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}><Feather name="alert-circle" size={22} color={C.danger} /></View>
          <Text style={styles.stateTitle}>Orders unavailable</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}><Feather name="package" size={22} color={C.ink} /></View>
          <Text style={styles.stateTitle}>Nothing here yet</Text>
          <Text style={styles.stateBody}>Orders you place will appear here with their delivery details and status.</Text>
          <Pressable onPress={() => router.replace('/(tabs)/shop')} style={styles.shopButton}>
            <Text style={styles.shopButtonText}>Explore the shop</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.muted} />}
        >
          <Text style={styles.listIntro}>A record of your WearX purchases.</Text>
          {orders.map((order) => {
            const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
            return (
              <View key={order._id} style={styles.order}>
                <View style={styles.orderTop}>
                  <View style={styles.orderIdBlock}>
                    <Text style={styles.orderLabel}>ORDER</Text>
                    <Text style={styles.orderId}>#{String(order._id || '').slice(-8).toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>{order.status || 'pending'}</Text>
                  </View>
                </View>

                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                <View style={styles.divider} />
                {(order.items || []).map((item, index) => (
                  <View key={`${item.product || item.name}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemMeta}>
                        {[item.selectedSize && `Size ${item.selectedSize}`, item.selectedColor, `Qty ${item.quantity}`].filter(Boolean).join(' / ')}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />
                {order.subtotal != null && (
                  <>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.breakdownValue}>{formatPrice(order.subtotal)}</Text>
                    </View>
                    {order.discount > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.totalLabel}>Discount{order.promoCode ? ` · ${order.promoCode}` : ''}</Text>
                        <Text style={styles.discountValue}>-{formatPrice(order.discount)}</Text>
                      </View>
                    )}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.totalLabel}>Delivery</Text>
                      <Text style={styles.breakdownValue}>{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Order total</Text>
                  <Text style={styles.totalValue}>{formatPrice(order.totalPrice)}</Text>
                </View>
                {!!order.shippingAddress && (
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={14} color={C.muted} />
                    <Text style={styles.addressText} numberOfLines={2}>
                      {order.shippingAddress.fullName} · {order.shippingAddress.address}, {order.shippingAddress.city}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.line },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: C.surface },
  headerCopy: { flex: 1, marginLeft: 12 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: '700' },
  headerTitle: { marginTop: 2, color: C.ink, fontSize: 17, fontWeight: '700' },
  countBadge: { minWidth: 30, height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 15, backgroundColor: C.surface },
  countText: { color: C.ink, fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  stateIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: C.surface },
  stateTitle: { marginTop: 17, color: C.ink, fontSize: 18, fontWeight: '700' },
  stateBody: { maxWidth: 300, marginTop: 7, color: C.body, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retryButton: { marginTop: 17, paddingHorizontal: 19, paddingVertical: 11, borderRadius: 7, backgroundColor: C.ink },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  shopButton: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 19, paddingHorizontal: 17, paddingVertical: 13, borderRadius: 7, backgroundColor: C.ink },
  shopButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  listIntro: { marginBottom: 12, color: C.muted, fontSize: 12 },
  order: { marginBottom: 12, padding: 16, borderRadius: 10, backgroundColor: C.surface },
  orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderIdBlock: { gap: 4 },
  orderLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  orderId: { color: C.ink, fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  orderDate: { marginTop: 7, color: C.muted, fontSize: 11 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  itemCopy: { flex: 1, paddingRight: 12 },
  itemName: { color: C.body, fontSize: 12, fontWeight: '600' },
  itemMeta: { marginTop: 4, color: C.muted, fontSize: 10 },
  itemPrice: { color: C.body, fontSize: 11, fontWeight: '600' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: C.body, fontSize: 12 },
  breakdownValue: { color: C.body, fontSize: 11 },
  discountValue: { color: '#0F7B55', fontSize: 11, fontWeight: '600' },
  totalValue: { color: C.ink, fontSize: 15, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  addressText: { flex: 1, color: C.muted, fontSize: 10, lineHeight: 15 },
});