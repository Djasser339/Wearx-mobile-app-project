import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/app-header'

const INK = '#0F1115';
const MUTED = '#8B929C';

// [outline, filled] icon for each tab
const ICONS = {
  explore: ['home-outline', 'home'],
  shop: ['grid-outline', 'grid'],
  wishlist: ['heart-outline', 'heart'],
  cart: ['bag-outline', 'bag'],
  profile: ['person-outline', 'person'],
};

const icon =
  (name) =>
  ({ focused, color, size }) =>
    <Ionicons name={ICONS[name][focused ? 1 : 0]} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Home', tabBarIcon: icon('explore') }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: icon('shop') }} />
      <Tabs.Screen name="whishlist" options={{ title: 'Wishlist', tabBarIcon: icon('wishlist') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: icon('cart'),
          tabBarBadge: 2, // placeholder until the cart count comes from shared state
          tabBarBadgeStyle: { backgroundColor: INK, color: '#fff', fontSize: 10 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('profile') }} />
    </Tabs>
  );
}