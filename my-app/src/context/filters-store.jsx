import { useSyncExternalStore } from 'react';

/**
 * Shared filter state for the Explore screen and the /filters screen.
 * No provider needed: it's a plain module-level store.
 */
export const DEFAULT_FILTERS = {
  category: null,
  sort: 'newest',
  minPrice: '',
  maxPrice: '',
  brand: null,
  sizes: [],
  colors: [],
};

let state = DEFAULT_FILTERS;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function setFilters(patch) {
  state = { ...state, ...patch };
  emit();
}

export function resetFilters() {
  state = DEFAULT_FILTERS;
  emit();
}

export function useFilters() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function countActiveFilters(f) {
  return (
    (f.category ? 1 : 0) +
    (f.brand ? 1 : 0) +
    (f.sort !== 'newest' ? 1 : 0) +
    (f.minPrice ? 1 : 0) +
    (f.maxPrice ? 1 : 0) +
    (f.sizes?.length ? 1 : 0) +
    (f.colors?.length ? 1 : 0)
  );
}