import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, RefreshControl, Modal,
  ScrollView, TextInput,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { bookingsAPI, reviewsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

const SECTIONS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'rescheduled', label: 'Rescheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function BookingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const alertedIds = useRef<Set<string>>(new Set());

  useEffect(() => { loadBookings(); }, []);

  // In-app 10-minute reminder check (runs every 30s while this tab is mounted)
  useEffect(() => {
    const check = () => {
      const now = new Date().getTime();
      upcoming.forEach((b: any) => {
        if (b.status !== 'CONFIRMED' || alertedIds.current.has(b.id)) return;
        const start = new Date(`${b.bookingDate}T${b.bookingTime}`).getTime();
        const minutesAway = (start - now) / 60000;
        if (minutesAway > 0 && minutesAway <= 10) {
          alertedIds.current.add(b.id);
          Alert.alert(
            '⏰ Appointment Reminder',
            `Your ${b.serviceName} at ${b.shopName} starts in ${Math.round(minutesAway)} minutes!`
          );
        }
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [upcoming]);

  // Schedule local notifications 10 min before each confirmed booking
  const scheduleReminders = async (bookings: any[]) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const b of bookings) {
        if (b.status !== 'CONFIRMED') continue;
        const start = new Date(`${b.bookingDate}T${b.bookingTime}`);
        const remindAt = new Date(start.getTime() - 10 * 60000);
        if (remindAt.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Appointment in 10 minutes',
            body: `${b.serviceName} at ${b.shopName} — ${b.bookingTime}`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindAt },
        });
      }
    } catch (error) {
      // Notifications not available (e.g. Expo Go limitations) — in-app alert still works
    }
  };

  const loadBookings = async () => {
    try {
      const [upcomingRes, pastRes] = await Promise.all([
        bookingsAPI.getUpcoming(),
        bookingsAPI.getPast(),
      ]);
      setUpcoming(upcomingRes.data);
      setPast(pastRes.data);
      scheduleReminders(upcomingRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelBooking = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await bookingsAPI.cancel(bookingId);
            loadBookings();
            Alert.alert('Cancelled', 'Your booking has been cancelled');
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const openReschedule = (booking: any) => {
    setSelectedBooking(booking);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
    setRescheduleModal(true);
  };

  const loadRescheduleSlots = async (booking: any, dateStr: string) => {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const response = await bookingsAPI.getSlots(booking.shopId, dateStr, booking.serviceId);
      setSlots(response.data.open ? (response.data.slots || []) : []);
    } catch (error) {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const rescheduleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }
    try {
      await bookingsAPI.reschedule(selectedBooking.id, {
        bookingDate: selectedDate,
        bookingTime: selectedTime + ':00',
      });
      setRescheduleModal(false);
      loadBookings();
      Alert.alert('Success', 'Booking rescheduled!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reschedule');
    }
  };

  const submitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }
    try {
      await reviewsAPI.create({
        shopId: reviewBooking.shopId,
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewText,
      });
      setReviewModal(false);
      setReviewText('');
      setReviewRating(5);
      Alert.alert('Thank you!', 'Your review has been posted.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit review');
    }
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
          date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        value: date.toISOString().split('T')[0],
      });
    }
    return days;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '#4CAF50';
      case 'PENDING': return '#FF9800';
      case 'CANCELLED': return '#f44336';
      case 'COMPLETED': return '#888';
      default: return '#888';
    }
  };

  const sectionData = () => {
    switch (activeTab) {
      case 'upcoming': return upcoming.filter((b: any) => !b.rescheduled);
      case 'rescheduled': return upcoming.filter((b: any) => b.rescheduled);
      case 'completed': return past.filter((b: any) => b.status === 'COMPLETED');
      case 'cancelled': return past.filter((b: any) => b.status === 'CANCELLED');
      default: return [];
    }
  };

  const sectionCount = (id: string) => {
    switch (id) {
      case 'upcoming': return upcoming.filter((b: any) => !b.rescheduled).length;
      case 'rescheduled': return upcoming.filter((b: any) => b.rescheduled).length;
      case 'completed': return past.filter((b: any) => b.status === 'COMPLETED').length;
      case 'cancelled': return past.filter((b: any) => b.status === 'CANCELLED').length;
      default: return 0;
    }
  };

  const renderBooking = ({ item }: any) => (
    <View style={[styles.bookingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.bookingHeader}>
        <Text style={[styles.shopName, { color: theme.text }]}>{item.shopName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.serviceName, { color: theme.accent }]}>{item.serviceName}</Text>
      <View style={styles.bookingDetails}>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>📅 {item.bookingDate}</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>🕐 {item.bookingTime}</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>💰 GHS {item.servicePrice}</Text>
        {item.paymentStatus === 'PAID' && (
          <Text style={styles.paidLine}>✅ Paid GHS {item.amountPaid} — receipt on file</Text>
        )}
      </View>
      {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.rescheduleBtn, { borderColor: theme.accent }]}
            onPress={() => openReschedule(item)}
          >
            <Text style={[styles.rescheduleBtnText, { color: theme.accent }]}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => cancelBooking(item.id)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'COMPLETED' && (
        <TouchableOpacity
          style={[styles.reviewBtn, { backgroundColor: theme.accent }]}
          onPress={() => { setReviewBooking(item); setReviewModal(true); }}
        >
          <Text style={styles.reviewBtnText}>⭐ Leave a Review</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Bookings</Text>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.tab, activeTab === section.id && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(section.id)}
          >
            <Text style={[styles.tabText, { color: activeTab === section.id ? theme.accent : theme.textTertiary }]}>
              {section.label} ({sectionCount(section.id)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={sectionData()}
          keyExtractor={(item: any) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBookings(); }} tintColor={theme.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No {activeTab} bookings</Text>
            </View>
          }
        />
      )}

      {/* Reschedule Modal */}
      <Modal visible={rescheduleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reschedule Booking</Text>
            <ScrollView>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Select Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getNext7Days().map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dateChip,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      selectedDate === day.value && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => {
                      setSelectedDate(day.value);
                      loadRescheduleSlots(selectedBooking, day.value);
                    }}
                  >
                    <Text style={[styles.dateChipText, { color: selectedDate === day.value ? '#000' : theme.textSecondary }]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Available Times</Text>
              {!selectedDate ? (
                <Text style={[styles.slotsHint, { color: theme.textTertiary }]}>Pick a date first</Text>
              ) : slotsLoading ? (
                <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
              ) : slots.length === 0 ? (
                <Text style={[styles.slotsHint, { color: theme.textTertiary }]}>
                  No available times on this day
                </Text>
              ) : (
                <View style={styles.timesGrid}>
                  {slots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        { backgroundColor: theme.background, borderColor: theme.border },
                        selectedTime === time && { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[styles.timeChipText, { color: selectedTime === time ? '#000' : theme.textSecondary }]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setRescheduleModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.accent }]}
                onPress={rescheduleBooking}
              >
                <Text style={styles.modalConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Review {reviewBooking?.shopName}
            </Text>
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
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setReviewModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.accent }]}
                onPress={submitReview}
              >
                <Text style={styles.modalConfirmBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '900' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 20 },
  bookingCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shopName: { fontSize: 16, fontWeight: '700', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  serviceName: { fontSize: 14, marginBottom: 12 },
  bookingDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  detailText: { fontSize: 13 },
  paidLine: { fontSize: 13, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8 },
  rescheduleBtn: {
    flex: 1, borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  rescheduleBtnText: { fontWeight: '600', fontSize: 13 },
  cancelBtn: {
    flex: 1, backgroundColor: '#1a0a0a', borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#f44336',
  },
  cancelBtnText: { color: '#f44336', fontWeight: '600', fontSize: 13 },
  reviewBtn: { borderRadius: 8, padding: 10, alignItems: 'center' },
  reviewBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  modalLabel: { fontSize: 13, marginBottom: 12, marginTop: 8 },
  dateChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, marginRight: 8,
  },
  dateChipText: { fontSize: 13 },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  timeChipText: { fontSize: 13 },
  slotsHint: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBtn: { fontSize: 30 },
  reviewInput: {
    borderRadius: 8, padding: 12, fontSize: 14,
    borderWidth: 1, minHeight: 80, textAlignVertical: 'top', marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  modalCancelBtnText: { fontWeight: '600' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalConfirmBtnText: { color: '#000', fontWeight: '700' },
});
