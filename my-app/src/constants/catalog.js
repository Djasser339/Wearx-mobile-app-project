export const CURRENCY = 'DA';

// Matches the `category` enum on the Product schema.
export const CATEGORIES = [
  { id: 'T-Shirts',    label: 'T-Shirts',    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=70' },
  { id: 'Shirts',      label: 'Shirts',      image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&q=70' },
  { id: 'Pants',       label: 'Pants',       image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&q=70' },
  { id: 'Shorts',      label: 'Shorts',      image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=300&q=70' },
  { id: 'Jackets',     label: 'Jackets',     image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=70' },
  { id: 'Shoes',       label: 'Shoes',       image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&q=70' },
  { id: 'Accessories', label: 'Accessories', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=300&q=70' },
];

// Values must match `sortOptions` in productController.getProducts.
export const SORTS = [
  { id: 'newest',     label: 'Newest' },
  { id: 'price_asc',  label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'rating',     label: 'Top rated' },
];