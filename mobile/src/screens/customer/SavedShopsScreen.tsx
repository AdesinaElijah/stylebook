import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { shopsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

export default function SavedShopsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFavourites(); }, []);

  const loadFavourites = async () => {
    try {
      const response = await shopsAPI.getFavourites();
      setShops(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFavourite = async (shopId: string) => {
    try {
      await shopsAPI.toggleFavourite(shopId);
      setShops((prev: any) => prev.filter((s: any) => s.id !== shopId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove from saved');
    }
  };

  const renderShop = ({ item }: any) => (
    <View style={[styles.shopCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity
        style={styles.shopInfo}
        onPress={() => navigation.navigate('ShopProfile', { shopId: item.id })}
      >
        <View style={[styles.shopIcon, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={styles.shopIconText}>
            {item.category === 'BARBERSHOP' ? '✂️' :
             item.category === 'SALON' ? '💇' :
             item.category === 'SPA' ? '🧖' : '💅'}
          </Text>
        </View>
        <View style={styles.shopDetails}>
          <Text style={[styles.shopName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.shopCategory, { color: theme.textSecondary }]}>
            {item.category} • {item.city}
          </Text>
          <Text style={[styles.shopRating, { color: theme.accent }]}>
            ⭐ {item.avgRating?.toFixed(1) || '0.0'}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => removeFavourite(item.id)}>
        <Text style={styles.removeBtn}>❤️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Saved Shops</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item: any) => item.id}
          renderItem={renderShop}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadFavourites(); }}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🤍</Text>
              <Text style={[styles.emptyText, { color: theme.text }]}>No saved shops yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Tap the heart on any shop to save it here
              </Text>
            </View>
          }
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 16 },
  backText: { fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '900' },
  list: { padding: 20 },
  shopCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1,
  },
  shopInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopIcon: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  shopIconText: { fontSize: 28 },
  shopDetails: { flex: 1 },
  shopName: { fontSize: 16, fontWeight: '700' },
  shopCategory: { fontSize: 13, marginTop: 2 },
  shopRating: { fontSize: 13, marginTop: 4 },
  removeBtn: { fontSize: 24, padding: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});