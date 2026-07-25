import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
  ScrollView, Modal, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { shopsAPI, promosAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: '✨' },
  { id: 'SALON', label: 'Salons', icon: '💇' },
  { id: 'BARBERSHOP', label: 'Barbershops', icon: '✂️' },
  { id: 'SPA', label: 'Spas', icon: '🧖' },
  { id: 'NAILS', label: 'Nails', icon: '💅' },
];
const CITIES = [
  { id: 'ALL', label: 'All Ghana', subtitle: 'Search nationwide', icon: 'GH' },
  { id: 'Accra', label: 'Accra', subtitle: 'Greater Accra Region', icon: '🏙️' },
  { id: 'Kumasi', label: 'Kumasi', subtitle: 'Ashanti Region', icon: '👑' },
  { id: 'Takoradi', label: 'Takoradi', subtitle: 'Western Region', icon: '⚓' },
  { id: 'Tamale', label: 'Tamale', subtitle: 'Northern Region', icon: '🏛️' },
  { id: 'Cape Coast', label: 'Cape Coast', subtitle: 'Central Region', icon: '🏰' },
  { id: 'Tema', label: 'Tema', subtitle: 'Greater Accra Region', icon: '🏭' },
];
// Sample shops shown when no real shops exist yet
const SEED_SHOPS = [
  { id: 'seed-1', isSeed: true, name: "Kofi's Cuts", category: 'BARBERSHOP', city: 'Accra', avgRating: 4.8, reviewCount: 124, plan: 'FREE', isOpen: true },
  { id: 'seed-2', isSeed: true, name: 'Adjoa Beauty Lounge', category: 'SALON', city: 'Kumasi', avgRating: 4.6, reviewCount: 89, plan: 'FREE', isOpen: true },
  { id: 'seed-3', isSeed: true, name: 'Serene Spa Retreat', category: 'SPA', city: 'Accra', avgRating: 4.9, reviewCount: 56, plan: 'FREE', isOpen: false },
  { id: 'seed-4', isSeed: true, name: 'Nail Bar Ghana', category: 'NAILS', city: 'Tema', avgRating: 4.7, reviewCount: 73, plan: 'FREE', isOpen: true },
];
export default function HomeScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [cityModal, setCityModal] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [promos, setPromos] = useState<any[]>([]);
  useEffect(() => {
    loadShops();
  }, [category, selectedCity, nearMe, userLoc]);
  const loadShops = async () => {
    try {
      let data;
      if (nearMe && userLoc) {
        const response = await shopsAPI.getNearby(userLoc.lat, userLoc.lng);
        data = response.data;
        if (category !== 'ALL') {
          data = data.filter((s: any) => s.category === category);
        }
        if (search) {
          data = data.filter((s: any) =>
            s.name?.toLowerCase().includes(search.toLowerCase())
          );
        }
      } else {
        const response = await shopsAPI.getAll(
          search || undefined,
          category === 'ALL' ? undefined : category
        );
        data = response.data;
        if (selectedCity.id !== 'ALL') {
          data = data.filter((s: any) =>
            s.city?.toLowerCase().includes(selectedCity.id.toLowerCase())
          );
        }
      }
      const noFilters = !search && category === 'ALL' && selectedCity.id === 'ALL' && !nearMe;
      setShops(data.length === 0 && noFilters ? SEED_SHOPS : data);
      try {
        const promoRes = await promosAPI.getAll();
        setPromos(promoRes.data);
      } catch (promoError) {
        // promos are optional decoration
      }
    } catch (error: any) {
      console.error('loadShops failed:', JSON.stringify(error.response?.data) || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const toggleNearMe = async () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow location access to find shops near you.');
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setNearMe(true);
    } catch (error) {
      Alert.alert('Error', 'Could not get your location. Make sure GPS is on.');
    }
  };
  const getShopEmoji = (category: string) => {
    switch (category) {
      case 'BARBERSHOP': return '✂️';
      case 'SALON': return '💇';
      case 'SPA': return '🧖';
      case 'NAILS': return '💅';
      default: return '🏪';
    }
  };
  const featuredShops = shops.filter(s => s.plan === 'PRO' || s.plan === 'ENTERPRISE');
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[
              styles.citySelector,
              { backgroundColor: theme.surfaceSecondary },
              nearMe && { opacity: 0.4 },
            ]}
            onPress={() => setCityModal(true)}
            disabled={nearMe}
          >
            <Text style={styles.citySelectorIcon}>📍</Text>
            <Text style={[styles.citySelectorText, { color: theme.text }]}>{selectedCity.label}</Text>
            <Text style={[styles.citySelectorChevron, { color: theme.text }]}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nearMeBtn,
              { backgroundColor: theme.surfaceSecondary },
              nearMe && { backgroundColor: theme.accent },
            ]}
            onPress={toggleNearMe}
          >
            <Text style={[
              styles.nearMeText,
              { color: theme.textSecondary },
              nearMe && { color: '#000', fontWeight: '700' },
            ]}>
              🧭 Near me
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: theme.surfaceSecondary }]}>
          <Ionicons name="notifications-outline" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShops(); }} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.appTitle, { color: theme.text }]}>StyleBook</Text>
          <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Find your perfect style</Text>
        </View>
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <Ionicons name="search-outline" size={18} color={theme.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search salons, barbershops, spas..."
              placeholderTextColor={theme.textTertiary}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={loadShops}
              returnKeyType="search"
            />
          </View>
        </View>
        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: theme.surfaceSecondary },
                category === cat.id && { backgroundColor: theme.accent },
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text style={[
                styles.categoryChipText,
                { color: theme.textSecondary },
                category === cat.id && { color: '#fff' },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {loading ? (
          <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Promo offers */}
            {promos.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>🎁 Promo Offers</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                  {promos.map((pr: any) => (
                    <TouchableOpacity
                      key={pr.id}
                      style={[styles.promoCard, { backgroundColor: theme.card }]}
                      onPress={() => navigation.navigate('ShopProfile', { shopId: pr.shopId })}
                    >
                      <Image source={{ uri: pr.imageUrl }} style={styles.promoImage} />
                      <View style={styles.promoInfo}>
                        <Text style={[styles.promoShopName, { color: theme.accent }]} numberOfLines={1}>
                          {pr.shopName} · {pr.city}
                        </Text>
                        <Text style={[styles.promoDetails, { color: theme.text }]} numberOfLines={2}>
                          {pr.details}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Featured & Trending */}
            {featuredShops.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 Featured & Trending</Text>
                  <TouchableOpacity>
                    <Text style={[styles.seeAll, { color: theme.accent }]}>See all ›</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                  {featuredShops.map((shop) => (
                    <TouchableOpacity
                      key={shop.id}
                      style={[styles.featuredCard, { backgroundColor: theme.card }]}
                      onPress={() => navigation.navigate('ShopProfile', { shopId: shop.id })}
                    >
                      <View style={styles.featuredImageContainer}>
                        {shop.coverImageUrl ? (
                          <Image source={{ uri: shop.coverImageUrl }} style={styles.featuredImage} />
                        ) : (
                          <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
                            <Text style={styles.featuredEmoji}>{getShopEmoji(shop.category)}</Text>
                          </View>
                        )}
                        <View style={styles.featuredBadgeRow}>
                          {shop.plan === 'PRO' && (
                            <View style={styles.trendingBadge}>
                              <Text style={styles.trendingBadgeText}>🔥 TRENDING</Text>
                            </View>
                          )}
                          {shop.avgRating >= 4.5 && (
                            <View style={styles.topRatedBadge}>
                              <Text style={styles.topRatedBadgeText}>⭐ TOP RATED</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.featuredInfo}>
                        <Text style={[styles.featuredName, { color: theme.text }]} numberOfLines={1}>
                          {shop.name}
                        </Text>
                        <View style={[styles.featuredCategoryBadge, { backgroundColor: theme.surfaceSecondary }]}>
                          <Text style={[styles.featuredCategory, { color: theme.accent }]}>{shop.category}</Text>
                        </View>
                        <Text style={[styles.featuredRating, { color: theme.textSecondary }]}>
                          {shop.avgRating > 0 ? `⭐ ${shop.avgRating.toFixed(1)}` : '☆☆☆☆☆ New'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {/* Discover Shops */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {nearMe ? '🧭 Shops Near You' : '📍 Discover Shops'}
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAll, { color: theme.accent }]}>See all ›</Text>
                </TouchableOpacity>
              </View>
              {shops.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyText, { color: theme.text }]}>No shops found</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    Try a different search or category
                  </Text>
                </View>
              ) : (
                shops.map((shop) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.discoverCard, { backgroundColor: theme.card }]}
                    onPress={() => shop.isSeed
                      ? Alert.alert('Sample Shop', 'This is a sample shop to show how StyleBook works. Real shops will appear here once owners register!')
                      : navigation.navigate('ShopProfile', { shopId: shop.id })}
                  >
                    <View style={styles.discoverImageContainer}>
                      {shop.coverImageUrl ? (
                        <Image source={{ uri: shop.coverImageUrl }} style={styles.discoverImage} />
                      ) : (
                        <View style={[styles.discoverImagePlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
                          <Text style={styles.discoverEmoji}>{getShopEmoji(shop.category)}</Text>
                        </View>
                      )}
                      {shop.isSeed && (
                        <View style={[styles.promoBadge, { backgroundColor: '#888' }]}>
                          <Text style={styles.promoBadgeText}>SAMPLE</Text>
                        </View>
                      )}
                      {shop.plan === 'PRO' && (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>PROMO</Text>
                        </View>
                      )}
                      <View style={styles.discoverDistanceBadge}>
                        <Text style={styles.discoverDistanceText}>
                          {nearMe && shop.distanceKm != null
                            ? `🧭 ${shop.distanceKm} km away`
                            : `📍 ${shop.city}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.discoverInfo}>
                      <View style={styles.discoverHeader}>
                        <Text style={[styles.discoverName, { color: theme.text }]}>{shop.name}</Text>
                        <View style={[styles.statusDot, shop.isOpen ? styles.openDot : styles.closedDot]} />
                      </View>
                      <Text style={[styles.discoverCategory, { color: theme.textSecondary }]}>
                        {shop.category}
                      </Text>
                      <View style={styles.discoverRating}>
                        <Text style={[styles.ratingStars, { color: theme.accent }]}>
                          {shop.avgRating > 0 ? `⭐ ${shop.avgRating.toFixed(1)}` : '☆☆☆☆☆'}
                        </Text>
                        <Text style={[styles.ratingNew, { color: theme.textSecondary }]}>
                          {shop.reviewCount > 0 ? `(${shop.reviewCount})` : 'New'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      {/* City Modal */}
      <Modal visible={cityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose City</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Filter shops by your preferred location
            </Text>
            <ScrollView>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.cityItem,
                    { borderBottomColor: theme.border },
                    selectedCity.id === city.id && { backgroundColor: theme.accentLight },
                  ]}
                  onPress={() => { setSelectedCity(city); setCityModal(false); }}
                >
                  <View style={[styles.cityIcon, { backgroundColor: theme.surfaceSecondary }]}>
                    <Text style={styles.cityIconText}>{city.icon}</Text>
                  </View>
                  <View style={styles.cityInfo}>
                    <Text style={[
                      styles.cityLabel,
                      { color: theme.text },
                      selectedCity.id === city.id && { color: theme.accent },
                    ]}>
                      {city.label}
                    </Text>
                    <Text style={[styles.citySubtitle, { color: theme.textSecondary }]}>
                      {city.subtitle}
                    </Text>
                  </View>
                  {selectedCity.id === city.id && (
                    <Text style={[styles.cityCheck, { color: theme.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  citySelector: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  citySelectorIcon: { fontSize: 14 },
  citySelectorText: { fontSize: 13, fontWeight: '600' },
  citySelectorChevron: { fontSize: 12 },
  nearMeBtn: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  nearMeText: { fontSize: 13, fontWeight: '600' },
  notificationBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  notificationIcon: { fontSize: 16 },
  titleSection: { paddingHorizontal: 20, paddingBottom: 16 },
  appTitle: { fontSize: 28, fontWeight: '900' },
  appSubtitle: { fontSize: 14, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  categoryList: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  featuredList: { paddingHorizontal: 20, gap: 12 },
  featuredCard: {
    width: 160, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  featuredImageContainer: { position: 'relative', height: 120 },
  featuredImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featuredImagePlaceholder: {
    height: 120, justifyContent: 'center', alignItems: 'center',
  },
  featuredEmoji: { fontSize: 48 },
  featuredBadgeRow: { position: 'absolute', top: 8, left: 8, gap: 4 },
  trendingBadge: {
    backgroundColor: '#C9884C', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  trendingBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  topRatedBadge: {
    backgroundColor: '#2E7D32', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  topRatedBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  featuredInfo: { padding: 10 },
  featuredName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  featuredCategoryBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  featuredCategory: { fontSize: 11, fontWeight: '600' },
  featuredRating: { fontSize: 11 },
  promoCard: {
    width: 250, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  promoImage: { width: '100%', height: 120, resizeMode: 'cover' },
  promoInfo: { padding: 10 },
  promoShopName: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  promoDetails: { fontSize: 13, lineHeight: 18 },
  discoverCard: {
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden',
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  discoverImageContainer: { position: 'relative', height: 160 },
  discoverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  discoverImagePlaceholder: {
    height: 160, justifyContent: 'center', alignItems: 'center',
  },
  discoverEmoji: { fontSize: 64 },
  promoBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#C9884C', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  promoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  discoverDistanceBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: '#000000aa', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  discoverDistanceText: { color: '#fff', fontSize: 11 },
  discoverInfo: { padding: 14 },
  discoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discoverName: { fontSize: 16, fontWeight: '700', flex: 1 },
  discoverCategory: { fontSize: 13, marginTop: 2 },
  discoverRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  openDot: { backgroundColor: '#4CAF50' },
  closedDot: { backgroundColor: '#ccc' },
  ratingStars: { fontSize: 12 },
  ratingNew: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 20 },
  cityItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, gap: 12,
  },
  cityIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  cityIconText: { fontSize: 18 },
  cityInfo: { flex: 1 },
  cityLabel: { fontSize: 15, fontWeight: '600' },
  citySubtitle: { fontSize: 12, marginTop: 2 },
  cityCheck: { fontSize: 18, fontWeight: '700' },
});