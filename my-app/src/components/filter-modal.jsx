import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, CURRENCY, SORTS } from '../constants/catalog';
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  setFilters,
  useFilters,
} from '../context/filters-store';
import { getBrandsRequest } from '../services/api';

const C = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  ink: '#0F1115',
  body: '#3B4049',
  muted: '#8B929C',
  line: '#ECEEF1',
  backdrop: 'rgba(15, 17, 21, 0.45)',
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const digits = (t) => t.replace(/[^0-9]/g, '');

export default function FilterModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const applied = useFilters();

  const [draft, setDraft] = useState(applied);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Sync draft whenever the modal opens
  useEffect(() => {
    if (visible) {
      setDraft(applied);
    }
  }, [visible, applied]);

  // Load brands (cached in api.js)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBrandsLoading(true);
        const res = await getBrandsRequest();
        if (alive) setBrands(res.data || []);
      } catch {
        // brand section stays empty on error
      } finally {
        if (alive) setBrandsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const draftCount = countActiveFilters(draft);

  const onApply = () => {
    let { minPrice, maxPrice } = draft;
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    setFilters({ ...draft, minPrice, maxPrice });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* top grabber pill */}
          <View style={styles.grabber} />

          {/* header */}
          <View style={styles.head}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.headBtn}>
              <View style={styles.closeCircle}>
                <Ionicons name="close" size={18} color={C.ink} />
              </View>
            </Pressable>

            <Text style={styles.title}>Filters</Text>

            <Pressable
              onPress={() => setDraft(DEFAULT_FILTERS)}
              hitSlop={10}
              disabled={draftCount === 0}
              style={[styles.headBtn, { alignItems: 'flex-end' }]}
            >
              <Text style={[styles.reset, draftCount === 0 && styles.resetDisabled]}>Reset</Text>
            </Pressable>
          </View>

          {/* scrollable filter content */}
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipWrap}>
                <Chip
                  label="All"
                  active={!draft.category}
                  onPress={() => set('category', null)}
                />
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    active={draft.category === c.id}
                    onPress={() => set('category', draft.category === c.id ? null : c.id)}
                  />
                ))}
              </View>

              {/* Sort by */}
              <Text style={styles.label}>Sort by</Text>
              <View style={styles.chipWrap}>
                {SORTS.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.label}
                    active={draft.sort === s.id}
                    onPress={() => set('sort', s.id)}
                  />
                ))}
              </View>

              {/* Price Range */}
              <Text style={styles.label}>Price ({CURRENCY})</Text>
              <View style={styles.priceRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>{CURRENCY}</Text>
                  <TextInput
                    value={draft.minPrice}
                    onChangeText={(t) => set('minPrice', digits(t))}
                    placeholder="Min"
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    style={styles.priceInput}
                  />
                </View>
                <Text style={styles.priceDash}>—</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>{CURRENCY}</Text>
                  <TextInput
                    value={draft.maxPrice}
                    onChangeText={(t) => set('maxPrice', digits(t))}
                    placeholder="Max"
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    style={styles.priceInput}
                  />
                </View>
              </View>

              {/* Brand */}
              <Text style={styles.label}>Brand</Text>
              {brandsLoading && brands.length === 0 ? (
                <ActivityIndicator color={C.muted} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
              ) : brands.length === 0 ? (
                <Text style={styles.hint}>No brands available.</Text>
              ) : (
                <View style={styles.chipWrap}>
                  {brands.map((b) => (
                    <Chip
                      key={b}
                      label={b}
                      active={draft.brand === b}
                      onPress={() => set('brand', draft.brand === b ? null : b)}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* footer with Apply CTA */}
          <View style={styles.foot}>
            <Pressable style={styles.applyBtn} onPress={onApply}>
              <Text style={styles.applyText}>
                {draftCount > 0 ? `Apply Filters (${draftCount})` : 'Apply Filters'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: C.backdrop,
  },
  sheet: {
    maxHeight: '84%',
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6DAE1',
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  headBtn: {
    minWidth: 54,
    justifyContent: 'center',
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
  },
  reset: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    textDecorationLine: 'underline',
  },
  resetDisabled: {
    opacity: 0.25,
    textDecorationLine: 'none',
  },
  keyboardAvoid: {
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 13,
    color: C.muted,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  chipText: {
    fontSize: 13,
    color: C.body,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: C.bg,
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: C.ink,
    fontWeight: '500',
  },
  priceDash: {
    color: C.muted,
    fontWeight: '600',
  },
  foot: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.surface,
  },
  applyBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
