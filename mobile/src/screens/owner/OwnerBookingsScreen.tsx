import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { bookingsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

export default function OwnerBookingsScreen() {
  const { theme } = useTheme();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBookings = async () => {
    try {
      const response = await bookingsAPI.getShopAll();
      setBookings(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmBooking = async (id: string) => {
    try {
      await bookingsAPI.confirm(id);
      loadBookings();
      Alert.alert('Confirmed', 'Booking has been confirmed!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to confirm');
    }
  };

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive',
        onPress: async () => {
          try {
            await bookingsAPI.cancel(id);
            loadBookings();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  /**
   * Records payment taken at the shop.
   *
   * StyleBook doesn't handle money — the customer pays in cash, by MoMo or on a card
   * terminal, and this just logs which. The amount defaults to the listed price, so the
   * common case is two taps. The customer gets a receipt notification either way.
   */
  const markPaid = (booking: any) => {
    const record = async (method: string) => {
      try {
        await bookingsAPI.recordPayment(booking.id, { method });
        loadBookings();
        Alert.alert('Payment recorded', `${booking.customerName} has been sent a receipt.`);
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
      }
    };

    Alert.alert(
      'Record Payment',
      `GHS ${booking.servicePrice} for ${booking.serviceName}\n\nHow did ${booking.customerName} pay?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash', onPress: () => record('CASH') },
        { text: 'Mobile Money', onPress: () => record('MOBILE_MONEY') },
        { text: 'Card', onPress: () => record('CARD') },
      ]
    );
  };

  const deleteBooking = async (id: string) => {
    try {
      await bookingsAPI.deleteCancelled(id);
      loadBookings();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
    }
  };

  const deleteAllCancelled = () => {
    Alert.alert('Delete All Cancelled', 'Delete all cancelled bookings?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Delete All', style: 'destructive',
        onPress: async () => {
          try {
            await bookingsAPI.deleteAllCancelled();
            loadBookings();
          } catch (error: any) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  /** MOBILE_MONEY -> "Mobile Money" */
  const formatMethod = (method?: string) =>
    method
      ? method.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
      : '';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '#4CAF50';
      case 'PENDING': return '#FF9800';
      case 'CANCELLED': return '#f44336';
      case 'COMPLETED': return '#888';
      default: return '#888';
    }
  };

  const upcoming = bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'COMPLETED');
  const cancelled = bookings.filter(b => b.status === 'CANCELLED');

  const getActiveData = () => {
    switch (activeTab) {
      case 'upcoming': return upcoming;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return upcoming;
    }
  };

  const renderBooking = ({ item }: any) => (
    <View style={[styles.bookingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.bookingHeader}>
        <View>
          <Text style={[styles.customerName, { color: theme.text }]}>{item.customerName}</Text>
          <Text style={[styles.customerPhone, { color: theme.textSecondary }]}>{item.customerPhone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <Text style={[styles.serviceName, { color: theme.accent }]}>✂️ {item.serviceName}</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>📅 {item.bookingDate}</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>🕐 {item.bookingTime}</Text>
        <Text style={[styles.detailText, { color: theme.textSecondary }]}>💰 GHS {item.servicePrice}</Text>
        {item.paymentStatus === 'PAID' && (
          <Text style={styles.paidLine}>
            ✅ Paid GHS {item.amountPaid} · {formatMethod(item.paymentMethod)}
          </Text>
        )}
      </View>

      {item.status === 'PENDING' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.accentLight, borderColor: '#4CAF50' }]}
            onPress={() => confirmBooking(item.id)}
          >
            <Text style={styles.confirmBtnText}>✓ Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelBooking(item.id)}>
            <Text style={styles.cancelBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'CONFIRMED' && (
        <View style={styles.actionRow}>
          {item.paymentStatus !== 'PAID' && (
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: theme.accentLight }]}
              onPress={() => markPaid(item)}
            >
              <Text style={styles.payBtnText}>💵 Mark Paid</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelBooking(item.id)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Walk-ins and appointments closed out before payment was logged */}
      {item.status === 'COMPLETED' && item.paymentStatus !== 'PAID' && (
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: theme.accentLight }]}
          onPress={() => markPaid(item)}
        >
          <Text style={styles.payBtnText}>💵 Mark Paid</Text>
        </TouchableOpacity>
      )}

      {item.status === 'CANCELLED' && (
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: theme.textTertiary }]}
          onPress={() => deleteBooking(item.id)}
        >
          <Text style={[styles.deleteBtnText, { color: theme.textTertiary }]}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Bookings Inbox</Text>
        {cancelled.length > 0 && (
          <TouchableOpacity onPress={deleteAllCancelled}>
            <Text style={styles.deleteAllBtn}>Delete All Cancelled</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
        {[
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Done (${completed.length})` },
          { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomWidth: 2, borderBottomColor: theme.accent }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.accent : theme.textTertiary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={getActiveData()}
          keyExtractor={(item: any) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadBookings(); }}
              tintColor={theme.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No {activeTab} bookings</Text>
            </View>
          }
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  deleteAllBtn: { color: '#f44336', fontSize: 13, fontWeight: '600' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 20 },
  bookingCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  customerName: { fontSize: 16, fontWeight: '700' },
  customerPhone: { fontSize: 13, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingDetails: { gap: 4, marginBottom: 12 },
  serviceName: { fontSize: 14, fontWeight: '600' },
  detailText: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1 },
  confirmBtnText: { color: '#4CAF50', fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#1a0a0a', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f44336' },
  cancelBtnFull: { backgroundColor: '#1a0a0a', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f44336' },
  cancelBtnText: { color: '#f44336', fontWeight: '700' },
  payBtn: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  payBtnText: { color: '#4CAF50', fontWeight: '700' },
  paidLine: { fontSize: 13, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  deleteBtn: { borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1 },
  deleteBtnText: { fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16 },
});