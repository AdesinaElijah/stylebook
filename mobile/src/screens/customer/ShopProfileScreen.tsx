import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Linking, Image,
  TextInput, RefreshControl, Modal, Share,
} from 'react-native';
import { shopsAPI, reviewsAPI, messagesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

const TABS = ['Services', 'Photos', 'Reviews', 'Hours'];

export default function ShopProfileScreen({ route, navigation }: any) {
  const shopId = route?.params?.shopId;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [shop, setShop] = useState<any>(null);
  const [reviews, setReviews] = useState([]);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Services');
  const [isFavourited, setIsFavourited] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (shopId) {
      loadShop();
    } else {
      setLoading(false);
    }
  }, [shopId]);

  const loadShop = async () => {
    try {
      const [shopRes, reviewsRes, breakdownRes] = await Promise.all([
        shopsAPI.getById(shopId),
        reviewsAPI.getByShop(shopId),
        reviewsAPI.getBreakdown(shopId),
      ]);
      setShop(shopRes.data);
      setIsFavourited(shopRes.data.isFavourited);
      setReviews(reviewsRes.data);
      setBreakdown(breakdownRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load shop');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Opens the chat thread with this shop. Safe to tap repeatedly — the backend
   * returns the existing conversation rather than starting a new one.
   */
  const openChat = async () => {
    try {
      const res = await messagesAPI.openConversation(shopId);
      navigation.navigate('Chat', {
        conversationId: res.data.id,
        title: shop?.name,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Could not open chat');
    }
  };

  const shareShop = async () => {
    try {
      const parts = [
        `Check out ${shop?.name} on StyleBook! 💈`,
        `${shop?.category} in ${shop?.city}`,
        shop?.locationDescription ? `📍 ${shop.locationDescription}` : null,
        shop?.avgRating > 0 ? `⭐ ${shop.avgRating.toFixed(1)} (${shop.reviewCount} reviews)` : null,
        shop?.googleMapsLink ? `Directions: ${shop.googleMapsLink}` : null,
      ].filter(Boolean);
      await Share.share({ message: parts.join('\n') });
    } catch (error) {
      // user dismissed the share sheet
    }
  };

  const toggleFavourite = async () => {
    try {
      await shopsAPI.toggleFavourite(shopId);
      setIsFavourited(!isFavourited);
    } catch (error) {
      Alert.alert('Error', 'Failed to update favourite');
    }
  };

  const submitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }
    try {
      await reviewsAPI.create({ shopId, rating: reviewRating, comment: reviewText });
      setReviewText('');
      loadShop();
      Alert.alert('Success', 'Review submitted!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit review');
    }
  };

  const getOpenStatus = () => {
    if (!shop?.openingHours) return { isOpen: false, todayHours: 'Hours not set' };
    try {
      const hours = JSON.parse(shop.openingHours);
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const today = days[new Date().getDay()];
      const todayHours = hours[today];
      if (!todayHours || todayHours === 'CLOSED') return { isOpen: false, todayHours: 'Closed today' };
      const [open, close] = todayHours.split('-');
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = open.split(':').map(Number);
      const [closeH, closeM] = close.split(':').map(Number);
      const openMins = openH * 60 + openM;
      const closeMins = closeH * 60 + closeM;
      return {
        isOpen: currentTime >= openMins && currentTime < closeMins,
        todayHours: `${open} - ${close}`,
      };
    } catch {
      return { isOpen: false, todayHours: 'Hours not available' };
    }
  };

  if (!shopId) {
    return (
      <ThemedScreen>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.errorText, { color: theme.text }]}>Shop not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backLink, { color: theme.accent }]}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </ThemedScreen>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  const { isOpen, todayHours } = getOpenStatus();

  return (
    <ThemedScreen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShop(); }} tintColor={theme.accent} />}
      >
        {/* Cover Photo */}
        <View style={styles.coverPhoto}>
          {shop?.coverImageUrl ? (
            <Image source={{ uri: shop.coverImageUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.surfaceSecondary }]}>
              <Text style={styles.coverEmoji}>
                {shop?.category === 'BARBERSHOP' ? '✂️' :
                 shop?.category === 'SALON' ? '💇' :
                 shop?.category === 'SPA' ? '🧖' : '💅'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartBtn} onPress={toggleFavourite}>
            <Text style={styles.heartBtnText}>{isFavourited ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={shareShop}>
            <Text style={styles.heartBtnText}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Info */}
        <View style={[styles.shopInfo, { backgroundColor: theme.surface }]}>
          <View style={styles.shopTitleRow}>
            <Text style={[styles.shopName, { color: theme.text }]}>{shop?.name}</Text>
            <View style={[styles.badge, { backgroundColor: shop?.plan === 'PRO' ? theme.accent : theme.surfaceSecondary }]}>
              <Text style={[styles.badgeText, { color: shop?.plan === 'PRO' ? '#fff' : theme.textSecondary }]}>
                {shop?.plan}
              </Text>
            </View>
          </View>
          <Text style={[styles.shopCategory, { color: theme.textSecondary }]}>
            {shop?.category} • {shop?.city}
          </Text>
          {shop?.locationDescription && (
            <Text style={[styles.locationDescription, { color: theme.textSecondary }]}>
              🏢 {shop.locationDescription}
            </Text>
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isOpen ? styles.openDot : styles.closedDot]} />
            <Text style={[styles.statusText, isOpen ? styles.openText : styles.closedText]}>
              {isOpen ? 'Open Now' : 'Closed'}
            </Text>
            <Text style={[styles.hoursText, { color: theme.textSecondary }]}> • {todayHours}</Text>
          </View>

          <View style={styles.ratingRow}>
            <Text style={[styles.ratingText, { color: theme.accent }]}>
              ⭐ {shop?.avgRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={[styles.reviewCount, { color: theme.textSecondary }]}>
              ({shop?.reviewCount || 0} reviews)
            </Text>
          </View>

          {shop?.description && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>{shop.description}</Text>
          )}

          <View style={styles.actionRow}>
            {shop?.googleMapsLink && (
              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={() => Linking.openURL(shop.googleMapsLink)}
              >
                <Text style={[styles.directionsBtnText, { color: theme.text }]}>📍 Get Directions</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
              onPress={openChat}
            >
              <Text style={[styles.directionsBtnText, { color: theme.text }]}>💬 Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookBtn, !isOpen && styles.bookBtnDisabled]}
              onPress={() => isOpen && navigation.navigate('Booking', { shop })}
              disabled={!isOpen}
            >
              <Text style={styles.bookBtnText}>
                {isOpen ? '📅 Book Now' : '🔒 Closed'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? theme.accent : theme.textTertiary }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={[styles.tabContent, { backgroundColor: theme.background }]}>
          {activeTab === 'Services' && (
            <View>
              {shop?.services?.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No services listed yet</Text>
              ) : (
                shop?.services?.map((service: any) => (
                  <View key={service.id} style={[styles.serviceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View>
                      <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                      <Text style={[styles.serviceDuration, { color: theme.textSecondary }]}>⏱ {service.durationMinutes} mins</Text>
                    </View>
                    <Text style={[styles.servicePrice, { color: theme.accent }]}>GHS {service.price}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'Photos' && (
            <View style={styles.photosGrid}>
              {shop?.photoUrls?.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No photos yet</Text>
              ) : (
                shop?.photoUrls?.map((url: string, i: number) => (
                  <Image key={i} source={{ uri: url }} style={styles.photoImage} />
                ))
              )}
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View>
              {breakdown && (
                <View style={[styles.breakdownCard, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.avgRating, { color: theme.accent }]}>
                    {breakdown.averageRating?.toFixed(1) || '0.0'}
                  </Text>
                  <Text style={[styles.totalReviews, { color: theme.textSecondary }]}>
                    {breakdown.totalReviews} reviews
                  </Text>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <View key={star} style={styles.starRow}>
                      <Text style={[styles.starLabel, { color: theme.textSecondary }]}>{star}⭐</Text>
                      <View style={[styles.starBar, { backgroundColor: theme.surfaceSecondary }]}>
                        <View style={[styles.starFill, {
                          width: `${breakdown.totalReviews > 0 ?
                            (breakdown[`${['', 'one', 'two', 'three', 'four', 'five'][star]}Star`] / breakdown.totalReviews) * 100 : 0}%`,
                          backgroundColor: theme.accent,
                        }]} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.reviewForm, { backgroundColor: theme.surface }]}>
                <Text style={[styles.reviewFormTitle, { color: theme.text }]}>Write a Review</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                      <Text style={styles.starBtn}>{star <= reviewRating ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.reviewInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Share your experience..."
                  placeholderTextColor={theme.textTertiary}
                  multiline numberOfLines={3}
                  value={reviewText}
                  onChangeText={setReviewText}
                />
                <TouchableOpacity
                  style={[styles.submitReviewBtn, { backgroundColor: theme.accent }]}
                  onPress={submitReview}
                >
                  <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                </TouchableOpacity>
              </View>

              {reviews.map((review: any) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewerName, { color: theme.text }]}>{review.customerName}</Text>
                    <Text style={styles.reviewRating}>{'⭐'.repeat(review.rating)}</Text>
                  </View>
                  <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>{review.comment}</Text>
                  {review.ownerReply && (
                    <View style={[styles.ownerReply, { backgroundColor: theme.background }]}>
                      <Text style={[styles.ownerReplyLabel, { color: theme.accent }]}>Owner's Reply:</Text>
                      <Text style={[styles.ownerReplyText, { color: theme.textSecondary }]}>{review.ownerReply}</Text>
                    </View>
                  )}
                  <Text style={[styles.reviewDate, { color: theme.textTertiary }]}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Hours' && (
            <View>
              {shop?.openingHours ? (
                Object.entries(JSON.parse(shop.openingHours)).map(([day, hours]: any) => (
                  <View key={day} style={[styles.hoursRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.hoursDay, { color: theme.text }]}>{day}</Text>
                    <Text style={[styles.hoursTime, { color: theme.accent }]}>{hours || 'Closed'}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Hours not set</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  backLink: { fontSize: 16, fontWeight: '600' },
  coverPhoto: { height: 250, position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  coverEmoji: { fontSize: 80 },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: '#000a', borderRadius: 20, padding: 8 },
  backBtnText: { color: '#fff', fontSize: 20 },
  heartBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: '#000a', borderRadius: 20, padding: 8 },
  shareBtn: { position: 'absolute', top: 16, right: 64, backgroundColor: '#000a', borderRadius: 20, padding: 8 },
  heartBtnText: { fontSize: 20 },
  shopInfo: { padding: 20 },
  shopTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopName: { fontSize: 24, fontWeight: '800', flex: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  shopCategory: { fontSize: 14, marginTop: 4 },
  locationDescription: { fontSize: 13, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  openDot: { backgroundColor: '#4CAF50' },
  closedDot: { backgroundColor: '#f44336' },
  statusText: { fontSize: 14, fontWeight: '700' },
  openText: { color: '#4CAF50' },
  closedText: { color: '#f44336' },
  hoursText: { fontSize: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  ratingText: { fontSize: 16, fontWeight: '700' },
  reviewCount: { fontSize: 14 },
  description: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  directionsBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  directionsBtnText: { fontWeight: '600' },
  messageBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  bookBtn: { flex: 1, backgroundColor: '#C9A84C', borderRadius: 12, padding: 14, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#888' },
  bookBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabContent: { padding: 20 },
  serviceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1,
  },
  serviceName: { fontSize: 15, fontWeight: '600' },
  serviceDuration: { fontSize: 13, marginTop: 4 },
  servicePrice: { fontSize: 16, fontWeight: '700' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoImage: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  breakdownCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  avgRating: { fontSize: 48, fontWeight: '900', textAlign: 'center' },
  totalReviews: { textAlign: 'center', marginBottom: 16 },
  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  starLabel: { width: 40, fontSize: 12 },
  starBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  starFill: { height: '100%', borderRadius: 3 },
  reviewForm: { borderRadius: 12, padding: 16, marginBottom: 16 },
  reviewFormTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starBtn: { fontSize: 28 },
  reviewInput: {
    borderRadius: 8, padding: 12, fontSize: 14,
    borderWidth: 1, minHeight: 80, textAlignVertical: 'top',
  },
  submitReviewBtn: { borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  submitReviewBtnText: { color: '#000', fontWeight: '700' },
  reviewCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewerName: { fontWeight: '700' },
  reviewRating: { fontSize: 12 },
  reviewComment: { fontSize: 14, lineHeight: 20 },
  ownerReply: { borderRadius: 8, padding: 12, marginTop: 8 },
  ownerReplyLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  ownerReplyText: { fontSize: 13 },
  reviewDate: { fontSize: 11, marginTop: 8 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  hoursDay: { fontWeight: '600' },
  hoursTime: {},
  emptyText: { textAlign: 'center', paddingVertical: 32, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalServiceItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  modalServiceName: { fontSize: 15, fontWeight: '600' },
  modalServiceMeta: { fontSize: 12, marginTop: 2 },
  modalServiceArrow: { fontSize: 22, fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', marginTop: 16 },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
});