import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth-context';
import { useCart } from '../context/cart-context';
import { createOrderRequest } from '../services/api';

const CURRENCY = 'DA';
const PROMO_CODE = 'WEARX10';
const PROMO_RATE = 0.1;
const FREE_SHIPPING_MIN = 15000;
const SHIPPING_FEE = 500;
const formatPrice = (value) => `${Number(value || 0).toLocaleString('en-US')} ${CURRENCY}`;

const C = {
  bg: '#F5F6F8', surface: '#FFFFFF', ink: '#0F1115', body: '#3B4049', muted: '#8B929C',
  line: '#ECEEF1', danger: '#C1272D', green: '#0F7B55',
};

const FIELDS = [
  { key: 'fullName', label: 'Full name', placeholder: 'Name of the person receiving the order', autoComplete: 'name' },
  { key: 'phone', label: 'Phone number', placeholder: 'Your contact number', keyboardType: 'phone-pad', autoComplete: 'tel' },
  { key: 'address', label: 'Street address', placeholder: 'Building, street, apartment', autoComplete: 'street-address' },
  { key: 'city', label: 'City', placeholder: 'City or town', autoComplete: 'address-level2' },
  { key: 'postalCode', label: 'Postal code', placeholder: 'Optional', keyboardType: 'number-pad', autoComplete: 'postal-code', optional: true },
];

export default function Checkout() {
  const { token, user } = useAuth();
  const { items, refresh } = useCart();
  const params = useLocalSearchParams();
  const promoCode = params.promoCode === PROMO_CODE ? PROMO_CODE : '';
  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    postalCode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  const itemSubtotal = items.reduce((total, item) => total + item.price * item.qty, 0);
  const discount = promoCode ? itemSubtotal * PROMO_RATE : 0;
  const shipping = itemSubtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  const orderTotal = itemSubtotal - discount + shipping;

  const submitOrder = async () => {
    const missing = FIELDS.find((field) => !field.optional && !address[field.key].trim());
    if (missing) {
      setError(`Please enter your ${missing.label.toLowerCase()}.`);
      return;
    }
    if (!items.length) {
      setError('Your bag is empty. Add an item before checking out.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await createOrderRequest(token, {
        ...address,
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        address: address.address.trim(),
        city: address.city.trim(),
        postalCode: address.postalCode.trim(),
      }, promoCode);
      setPlacedOrder(response.data);
      await refresh();
    } catch (requestError) {
      setError(requestError?.message || 'Your order could not be placed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <SafeAreaView style={[styles.screen, styles.successScreen]} edges={[]}>
        <StatusBar style="dark" />
        <View style={styles.successIcon}><Feather name="check" size={28} color={C.green} /></View>
        <Text style={styles.successEyebrow}>ORDER CONFIRMED</Text>
        <Text style={styles.successTitle}>Thank you, {placedOrder.shippingAddress?.fullName?.split(' ')[0]}.</Text>
        <Text style={styles.successBody}>Your order has been placed. You can follow its status from your order history.</Text>
        <View style={styles.confirmation}>
          <Text style={styles.confirmationLabel}>ORDER NUMBER</Text>
          <Text style={styles.confirmationValue}>{String(placedOrder._id || '').slice(-8).toUpperCase()}</Text>
          <View style={styles.divider} />
          <Text style={styles.confirmationLabel}>ORDER TOTAL</Text>
          <Text style={styles.confirmationTotal}>{formatPrice(placedOrder.totalPrice)}</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/orders')}>
          <Text style={styles.primaryButtonText}>View my orders</Text>
          <Feather name="arrow-right" size={17} color="#fff" />
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)/shop')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Continue shopping</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={21} color={C.ink} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>WEARX / BAG</Text>
            <Text style={styles.headerTitle}>Delivery details</Text>
          </View>
          <View style={styles.headerStep}><Text style={styles.headerStepText}>01 / 01</Text></View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.intro}>
            <Text style={styles.title}>Where should we send it?</Text>
            <Text style={styles.subtitle}>Add your delivery details to place your order.</Text>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryHeading}>
              <View style={styles.summaryIcon}><Feather name="shopping-bag" size={16} color={C.ink} /></View>
              <Text style={styles.summaryTitle}>Your order</Text>
              <Text style={styles.itemCount}>{items.reduce((sum, item) => sum + item.qty, 0)} ITEMS</Text>
            </View>
            {items.length ? items.map((item) => (
              <View key={item.key} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {[item.size && `Size ${item.size}`, item.color, `Qty ${item.qty}`].filter(Boolean).join(' / ')}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{formatPrice(item.price * item.qty)}</Text>
              </View>
            )) : (
              <Text style={styles.emptyCart}>Your bag is empty. Return to the shop to add items.</Text>
            )}
            <View style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>{formatPrice(itemSubtotal)}</Text>
            </View>
            {promoCode ? (
              <View style={styles.breakdownRow}>
                <Text style={styles.totalLabel}>Discount · {promoCode}</Text>
                <Text style={styles.discountValue}>-{formatPrice(discount)}</Text>
              </View>
            ) : null}
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Delivery</Text>
              <Text style={styles.breakdownValue}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Order total</Text>
              <Text style={styles.totalValue}>{formatPrice(orderTotal)}</Text>
            </View>
            <Text style={styles.totalNote}>Price, promo, and stock are confirmed by the store when you place the order.</Text>
          </View>

          <View style={styles.formHeading}>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <Text style={styles.requiredNote}>* REQUIRED</Text>
          </View>
          <View style={styles.form}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.label}>{field.label}{field.optional ? ' (optional)' : ' *'}</Text>
                <TextInput
                  value={address[field.key]}
                  onChangeText={(value) => setAddress((current) => ({ ...current, [field.key]: value }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={C.muted}
                  style={styles.input}
                  keyboardType={field.keyboardType || 'default'}
                  autoComplete={field.autoComplete}
                  autoCapitalize={field.key === 'phone' || field.key === 'postalCode' ? 'none' : 'words'}
                  returnKeyType="next"
                />
              </View>
            ))}
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={17} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.deliveryNote}>
            <Feather name="package" size={17} color={C.body} />
            <Text style={styles.deliveryNoteText}>Your delivery information is saved with this order.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>ITEMS TOTAL</Text>
            <Text style={styles.footerPrice}>{formatPrice(orderTotal)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={submitting || !items.length}
            style={({ pressed }) => [styles.primaryButton, styles.submitButton, (pressed || submitting || !items.length) && styles.buttonDim]}
            onPress={submitOrder}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Place order</Text>}
            {!submitting && <Feather name="arrow-right" size={17} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: C.bg },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: C.surface },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  eyebrow: { fontSize: 9, fontWeight: '700', color: C.muted },
  headerTitle: { marginTop: 2, fontSize: 17, fontWeight: '700', color: C.ink },
  headerStep: { paddingLeft: 8 },
  headerStepText: { fontSize: 10, fontWeight: '700', color: C.muted },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24 },
  intro: { marginBottom: 22 },
  title: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }), fontSize: 27, fontWeight: '700', lineHeight: 33, color: C.ink },
  subtitle: { marginTop: 7, fontSize: 13, lineHeight: 19, color: C.body },
  summary: { padding: 16, backgroundColor: C.surface, borderRadius: 12 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  summaryIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  summaryTitle: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '700' },
  itemCount: { color: C.muted, fontSize: 9, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemCopy: { flex: 1, paddingRight: 12 },
  itemName: { color: C.body, fontSize: 12, fontWeight: '600' },
  itemMeta: { color: C.muted, fontSize: 10, marginTop: 4 },
  itemPrice: { color: C.ink, fontSize: 12, fontWeight: '600' },
  emptyCart: { paddingVertical: 8, color: C.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalLabel: { color: C.body, fontSize: 12 },
  breakdownValue: { color: C.body, fontSize: 12 },
  discountValue: { color: C.green, fontSize: 12, fontWeight: '600' },
  totalValue: { color: C.ink, fontSize: 15, fontWeight: '700' },
  totalNote: { marginTop: 8, color: C.muted, fontSize: 10, lineHeight: 15 },
  formHeading: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: '700' },
  requiredNote: { color: C.muted, fontSize: 9, fontWeight: '700' },
  form: { gap: 13 },
  field: { gap: 6 },
  label: { color: C.body, fontSize: 11, fontWeight: '600' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: C.surface, color: C.ink, fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 14, borderRadius: 8, backgroundColor: '#FCE9EB' },
  errorText: { flex: 1, color: C.danger, fontSize: 12, lineHeight: 17 },
  deliveryNote: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, marginTop: 18, borderTopWidth: 1, borderTopColor: C.line },
  deliveryNoteText: { flex: 1, color: C.body, fontSize: 11, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
  footerTotal: { minWidth: 105 },
  footerLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  footerPrice: { marginTop: 4, color: C.ink, fontSize: 15, fontWeight: '700' },
  primaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: C.ink },
  submitButton: { flex: 1 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buttonDim: { opacity: 0.55 },
  successScreen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  successIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: '#DDF3E9' },
  successEyebrow: { marginTop: 24, color: C.green, fontSize: 10, fontWeight: '800' },
  successTitle: { marginTop: 9, color: C.ink, fontSize: 25, fontWeight: '700', textAlign: 'center' },
  successBody: { maxWidth: 300, marginTop: 9, color: C.body, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  confirmation: { alignSelf: 'stretch', marginTop: 25, padding: 17, borderRadius: 10, backgroundColor: C.surface },
  confirmationLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  confirmationValue: { marginTop: 6, color: C.ink, fontSize: 16, fontWeight: '700' },
  confirmationTotal: { marginTop: 5, color: C.ink, fontSize: 18, fontWeight: '700' },
  secondaryButton: { padding: 16 },
  secondaryButtonText: { color: C.body, fontSize: 13, fontWeight: '600' },
});