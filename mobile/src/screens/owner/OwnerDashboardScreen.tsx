import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { shopsAPI, bookingsAPI, postsAPI, reviewsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

export default function OwnerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [shop, setShop] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [shopRes, bookingsRes, postsRes, reviewsRes] = await Promise.all([
        shopsAPI.getMyShop(),
        bookingsAPI.getShopAll(),
        postsAPI.getByShop(user?.shopId || ''),
        reviewsAPI.getByShop(user?.shopId || ''),
      ]);
      setShop(shopRes.data);
      setBookings(bookingsRes.data);
      setPosts(postsRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Delete this post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await postsAPI.delete(postId);
            loadDashboard();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const fmtTime = (t: string) => {
    try {
      const [h, m] = t.split(':').map(Number);
      const ap = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 || 12;
      return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
    } catch {
      return t;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '#2E7D32';
      case 'PENDING': return '#FF9800';
      case 'CANCELLED': return '#f44336';
      default: return '#888';
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const recentBookings = bookings.slice(0, 3);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  const quickActions = [
    { emoji: '📅', title: 'View Bookings', sub: bookings.length + ' total · ' + pendingBookings.length + ' pending', screen: 'OwnerBookings' },
    { emoji: '✏️', title: 'Profile & Services', sub: 'Update shop details and services', screen: 'OwnerProfile' },
    { emoji: '📸', title: 'Create Post', sub: 'Share your work on the feed', screen: 'CreatePost' },
    { emoji: '⭐', title: 'Customer Reviews', sub: reviews.length + ' reviews', screen: 'OwnerReviews' },
  ];

  return (
    <ThemedScreen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={theme.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: theme.textSecondary }]}>Business Dashboard</Text>
          <Text style={[styles.shopTitle, { color: theme.text }]}>{shop?.name}</Text>
        </View>

        {/* Profile active banner */}
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerTitle}>✅ Profile Active</Text>
          <Text style={styles.activeBannerSub}>
            {shop?.city} · {shop?.category?.toLowerCase()} · Pull down to refresh
          </Text>
        </View>

        {/* Pending alert */}
        {pendingBookings.length > 0 && (
          <TouchableOpacity
            style={[styles.pendingAlert, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}
            onPress={() => navigation.navigate('OwnerBookings')}
          >
            <Text style={[styles.pendingAlertText, { color: theme.accent }]}>
              ⚠️ {pendingBookings.length} pending booking{pendingBookings.length > 1 ? 's' : ''} — auto-confirms in 45 seconds
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats 2x2 */}
        <View style={styles.statsGrid}>
          {[
            { emoji: '📅', num: bookings.length, label: 'Total Bookings' },
            { emoji: '✅', num: confirmedBookings.length, label: 'Confirmed' },
            { emoji: '📸', num: posts.length, label: 'Posts' },
            { emoji: '⭐', num: reviews.length, label: 'Reviews' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statNumber, { color: theme.accent }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>QUICK ACTIONS</Text>
        {quickActions.map((a) => (
          <TouchableOpacity
            key={a.title}
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate(a.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>{a.title}</Text>
              <Text style={[styles.actionSub, { color: theme.textSecondary }]}>{a.sub}</Text>
            </View>
            <Text style={[styles.chevron, { color: theme.textTertiary }]}>›</Text>
          </TouchableOpacity>
        ))}

        {/* My posts */}
        {posts.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MY POSTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postsRow}>
              {posts.slice(0, 6).map((post: any) => (
                <View key={post.id} style={styles.postCard}>
                  <View>
                    {post.imageUrl ? (
                      <Image source={{ uri: post.imageUrl }} style={[styles.postImage, { backgroundColor: theme.surfaceSecondary }]} />
                    ) : (
                      <View style={[styles.postImage, styles.postPlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
                        <Text style={{ fontSize: 32 }}>🖼️</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.postDeleteBtn} onPress={() => deletePost(post.id)}>
                      <Text style={styles.postDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.postLikes, { color: theme.textSecondary }]}>❤️ {post.likeCount} likes</Text>
                  {post.caption ? (
                    <Text style={[styles.postCaption, { color: theme.text }]} numberOfLines={1}>{post.caption}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Customer reviews */}
        {reviews.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 0, marginBottom: 0 }]}>
                CUSTOMER REVIEWS ({reviews.length})
              </Text>
              <TouchableOpacity
                style={[styles.seeAllBtn, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => navigation.navigate('OwnerReviews')}
              >
                <Text style={[styles.seeAllText, { color: theme.accent }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {reviews.slice(0, 2).map((review: any) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.surface }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerRow}>
                    <View style={[styles.reviewAvatar, { backgroundColor: theme.accent }]}>
                      <Text style={styles.reviewAvatarText}>
                        {review.customerName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.reviewerName, { color: theme.text }]}>{review.customerName}</Text>
                  </View>
                  <Text style={[styles.reviewStars, { color: theme.accent }]}>{'★'.repeat(review.rating)}</Text>
                </View>
                <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>{review.comment}</Text>
              </View>
            ))}
          </>
        )}

        {/* Recent bookings */}
        {recentBookings.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>RECENT BOOKINGS</Text>
            {recentBookings.map((b: any) => (
              <View key={b.id} style={[styles.bookingCard, { backgroundColor: theme.surface }]}>
                <View style={styles.bookingRow}>
                  <Text style={[styles.bookingService, { color: theme.text }]}>{b.serviceName}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(b.status) + '22' }]}>
                    <Text style={[styles.statusPillText, { color: statusColor(b.status) }]}>
                      {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.bookingMeta, { color: theme.textSecondary }]}>
                  {b.bookingDate} · {fmtTime(b.bookingTime)}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerLabel: { fontSize: 13 },
  shopTitle: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  activeBanner: {
    marginHorizontal: 20, borderRadius: 14, padding: 14,
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9',
  },
  activeBannerTitle: { color: '#1B5E20', fontSize: 15, fontWeight: '700' },
  activeBannerSub: { color: '#2E7D32', fontSize: 13, marginTop: 2 },
  pendingAlert: { marginHorizontal: 20, marginTop: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  pendingAlertText: { fontSize: 13, fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 20, marginTop: 16,
  },
  statCard: {
    width: '47%', borderRadius: 16, padding: 16,
  },
  statEmoji: { fontSize: 26, marginBottom: 8 },
  statNumber: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  actionEmoji: { fontSize: 20 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionSub: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '600' },
  postsRow: { paddingHorizontal: 20, gap: 12 },
  postCard: { width: 150 },
  postImage: { width: 150, height: 150, borderRadius: 12 },
  postPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  postDeleteBtn: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#000a', borderRadius: 11,
    width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
  },
  postDeleteText: { color: '#f44336', fontSize: 12, fontWeight: '700' },
  postLikes: { fontSize: 13, marginTop: 6 },
  postCaption: { fontSize: 13, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  seeAllBtn: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  seeAllText: { fontSize: 13, fontWeight: '700' },
  reviewCard: { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarText: { color: '#000', fontWeight: '800', fontSize: 15 },
  reviewerName: { fontSize: 15, fontWeight: '700' },
  reviewStars: { fontSize: 14 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  bookingCard: { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingService: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  bookingMeta: { fontSize: 13, marginTop: 6 },
});
