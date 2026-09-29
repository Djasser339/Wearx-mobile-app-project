import { useEffect, useState } from 'react';
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
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
};

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const digits = (t) => t.replace(/[^0-9]/g, '');

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const applied = useFilters();

  // Edit a draft; nothing changes on Explore until "Apply".
  const [draft, setDraft] = useState(applied);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const draftCount = countActiveFilters(draft);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getBrandsRequest();
        if (alive) setBrands(res.data || []);
      } catch {
        // non-fatal: brand section just stays empty
      } finally {
        if (alive) setBrandsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onApply = () => {
    let { minPrice, maxPrice } = draft;
    // if the user typed min > max, swap them instead of returning nothing
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    setFilters({ ...draft, minPrice, maxPrice });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <StatusBar style="dark" />

      {/* header */}
      <View style={[styles.head, { paddingTop: Platform.OS === 'ios' ? 18 : insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headBtn}>
          <Ionicons name="close" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.title}>Filters</Text>
        <Pressable
          onPress={() => setDraft(DEFAULT_FILTERS)}
          hitSlop={10}
          disabled={draftCount === 0}
          style={styles.headBtn}
        >
          <Text style={[styles.reset, draftCount === 0 && { opacity: 0.35 }]}>Reset</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          {/* category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipWrap}>
            <Chip label="All" active={!draft.category} onPress={() => set('category', null)} />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={draft.category === c.id}
                onPress={() => set('category', draft.category === c.id ? null : c.id)}
              />
            ))}
          </View>

          {/* sort */}
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

          {/* price */}
          <Text style={styles.label}>Price ({CURRENCY})</Text>
          <View style={styles.priceRow}>
            <TextInput
              value={draft.minPrice}
              onChangeText={(t) => set('minPrice', digits(t))}
              placeholder="Min"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              style={styles.priceInput}
            />
            <Text style={{ color: C.muted }}>—</Text>
            <TextInput
              value={draft.maxPrice}
              onChangeText={(t) => set('maxPrice', digits(t))}
              placeholder="Max"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              style={styles.priceInput}
            />
          </View>

          {/* brand */}
          <Text style={styles.label}>Brand</Text>
          {brandsLoading ? (
            <ActivityIndicator color={C.muted} style={{ alignSelf: 'flex-start' }} />
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

      {/* footer */}
      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable style={styles.applyBtn} onPress={onApply}>
          <Text style={styles.applyText}>
            {draftCount > 0 ? `Apply (${draftCount})` : 'Apply'}
          </Text>
        </Pressable>
      </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  headBtn: { minWidth: 48 },
  title: { fontFamily: serif, fontSize: 22, fontWeight: '700', color: C.ink },
  reset: { textAlign: 'right', fontSize: 14, fontWeight: '700', color: C.ink },

  body: { paddingHorizontal: 16, paddingBottom: 24 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 13, color: C.muted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: C.bg },
  chipActive: { backgroundColor: C.ink },
  chipText: { fontSize: 13, color: C.body, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
  },

  foot: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.surface,
  },
  applyBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});