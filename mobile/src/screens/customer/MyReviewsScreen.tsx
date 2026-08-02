import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { reviewsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

export default function MyReviewsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    try {
      const response = await reviewsAPI.getMyReviews();
      setReviews(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderReview = ({ item }: any) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.reviewHeader}>
        <Text style={[styles.shopName, { color: theme.accent }]}>{item.shopName}</Text>
        <Text style={styles.rating}>{'⭐'.repeat(item.rating)}</Text>
      </View>
      <Text style={[styles.comment, { color: theme.textSecondary }]}>{item.comment}</Text>
      {item.ownerReply && (
        <View style={[styles.ownerReply, { backgroundColor: theme.background }]}>
          <Text style={[styles.ownerReplyLabel, { color: theme.accent }]}>Owner's Reply</Text>
          <Text style={[styles.ownerReplyText, { color: theme.textSecondary }]}>{item.ownerReply}</Text>
        </View>
      )}
      <Text style={[styles.date, { color: theme.textTertiary }]}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>My Reviews</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item: any) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadReviews(); }}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={[styles.emptyText, { color: theme.text }]}>No reviews yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Book a service and leave your first review!
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
  reviewCard: {
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  shopName: { fontSize: 15, fontWeight: '700', flex: 1 },
  rating: { fontSize: 13 },
  comment: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  ownerReply: { borderRadius: 8, padding: 12, marginBottom: 8 },
  ownerReplyLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  ownerReplyText: { fontSize: 13 },
  date: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});