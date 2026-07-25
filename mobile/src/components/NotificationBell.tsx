import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { WebSocket as RNWebSocket } from 'react-native-websocket';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

const iconByType: Record<string, string> = {
  BOOKING_REQUEST: 'calendar-outline',
  BOOKING_CONFIRMED: 'checkmark-circle-outline',
  BOOKING_CANCELLED: 'close-circle-outline',
  NEW_MESSAGE: 'chatbubble-outline',
  PAYMENT_RECEIVED: 'cash-outline',
  NEW_REVIEW: 'star-outline',
  POST_LIKE: 'heart-outline',
  POST_COMMENT: 'chatbubble-ellipses-outline',
  POST_SHARE: 'share-social-outline',
};

export default function NotificationBell() {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token || !user?.userId) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await notificationsAPI.list({ unreadOnly: false, page: 0, size: 20 });
        setNotifications(res.data.content || []);
        const countRes = await notificationsAPI.unreadCount();
        setUnreadCount(countRes.data.count || 0);
      } catch (err) {
        console.warn('load notifications failed', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    const socket = new RNWebSocket(`wss://stylebook-production-0f92.up.railway.app/ws/websocket?token=${token}`);
    socket.onopen = () => {};
    socket.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data);
        setNotifications((prev) => [next, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.warn('notification socket message failed', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [token, user?.userId]);

  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    const now = new Date();

    notifications.forEach((item) => {
      const createdAt = new Date(item.createdAt);
      const sameDay = createdAt.toDateString() === now.toDateString();
      (sameDay ? today : earlier).push(item);
    });

    return { today, earlier };
  }, [notifications]);

  const handleOpen = async () => {
    setVisible(true);
    try {
      const res = await notificationsAPI.list({ unreadOnly: false, page: 0, size: 20 });
      setNotifications(res.data.content || []);
      const countRes = await notificationsAPI.unreadCount();
      setUnreadCount(countRes.data.count || 0);
    } catch (err) {
      console.warn('refresh notifications failed', err);
    }
  };

  const handleRead = async (item: NotificationItem) => {
    try {
      await notificationsAPI.markRead(item.id);
      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      const data = item.data ? JSON.parse(item.data) : {};
      if (data.bookingId) {
        navigation.navigate('Bookings');
      } else if (data.postId) {
        navigation.navigate('Feed');
      }
    } catch (err) {
      console.warn('mark read failed', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('mark all read failed', err);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => handleRead(item)}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={iconByType[item.type] || 'notifications-outline'} size={18} color="#2f6fed" />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]}>{item.title}</Text>
          {!item.isRead && <View style={styles.dot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.meta}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.button}>
        <Ionicons name="notifications-outline" size={20} color="#222" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.headerAction}>Mark all read</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={40} color="#8c8c8c" />
                <Text style={styles.emptyTitle}>You’re all caught up</Text>
                <Text style={styles.emptyBody}>New activity will show up here.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View>
                    {groupedNotifications.today.length > 0 && (
                      <Text style={styles.sectionTitle}>Today</Text>
                    )}
                    {groupedNotifications.today.map((item) => renderItem({ item }))}
                    {groupedNotifications.earlier.length > 0 && (
                      <Text style={styles.sectionTitle}>Earlier</Text>
                    )}
                    {groupedNotifications.earlier.map((item) => renderItem({ item }))}
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  button: { position: 'relative', padding: 8 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerAction: { color: '#2563eb', fontWeight: '600' },
  item: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececec' },
  itemUnread: { backgroundColor: '#f6f9ff' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  itemBody: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  titleUnread: { color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 8, marginBottom: 4 },
  emptyState: { paddingVertical: 30, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyBody: { color: '#6b7280', marginTop: 4 },
});
