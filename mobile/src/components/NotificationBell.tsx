import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../services/api';

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  BOOKING_REQUEST: 'calendar-outline',
  BOOKING_CONFIRMED: 'checkmark-circle-outline',
  BOOKING_CANCELLED: 'close-circle-outline',
  NEW_MESSAGE: 'chatbubble-outline',
  PAYMENT_RECEIVED: 'cash-outline',
  NEW_REVIEW: 'star-outline',
  POST_LIKE: 'thumbs-up-outline',
  POST_COMMENT: 'chatbox-outline',
  POST_SHARE: 'share-social-outline',
};

const NotificationBell = ({ navigation }: { navigation?: any }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async (currentUserId: string) => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsAPI.list(currentUserId, { page: 0, size: 20 }),
        notificationsAPI.unreadCount(currentUserId),
      ]);
      setNotifications(listRes.data.content || []);
      setUnreadCount(countRes.data.unreadCount || 0);
    } catch (error) {
      console.log('Notifications load failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
        loadNotifications(storedUserId);
      }
    };
    loadUser();
  }, []);

  const handleOpen = async () => {
    if (!userId) return;
    setVisible(true);
    await loadNotifications(userId);
  };

  const handleMarkRead = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await notificationsAPI.markRead(item.id);
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.log('Mark read failed', error);
      }
    }
    if (navigation && item.data) {
      const route = item.data.route || null;
      if (route) {
        navigation.navigate(route, item.data);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      await notificationsAPI.markAllRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.log('Mark all read failed', error);
    }
  };

  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];
    const now = new Date();

    notifications.forEach(item => {
      const created = new Date(item.createdAt);
      const sameDay = created.getDate() === now.getDate() && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      if (sameDay) today.push(item); else earlier.push(item);
    });

    return { today, earlier };
  }, [notifications]);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={handleOpen} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={24} color="#111827" />
        {unreadCount > 0 ? (
          <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
        ) : null}
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)} />
        <View style={styles.dropdown}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Notifications</Text>
            <TouchableOpacity onPress={handleMarkAllRead}><Text style={styles.markAll}>Mark all read</Text></TouchableOpacity>
          </View>

          {loading && notifications.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>Loading…</Text></View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>You’re all caught up.</Text></View>
          ) : (
            <FlatList
              data={[
                ...(groupedNotifications.today.length ? [{ key: 'today', section: 'Today', items: groupedNotifications.today }] : []),
                ...(groupedNotifications.earlier.length ? [{ key: 'earlier', section: 'Earlier', items: groupedNotifications.earlier }] : []),
              ]}
              keyExtractor={(section) => section.key}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.sectionTitle}>{item.section}</Text>
                  {item.items.map((notification: NotificationItem) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[styles.item, !notification.read && styles.unreadItem]}
                      onPress={() => handleMarkRead(notification)}>
                      <View style={styles.iconWrap}><Ionicons name={(typeIcons[notification.type] || 'notifications-outline') as any} size={18} color="#2563eb" /></View>
                      <View style={styles.itemBody}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemTitle}>{notification.title}</Text>
                          {!notification.read ? <View style={styles.dot} /> : null}
                        </View>
                        <Text style={styles.itemText}>{notification.body}</Text>
                        <Text style={styles.timeText}>{new Date(notification.createdAt).toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  bellButton: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  dropdown: { position: 'absolute', top: 48, right: 0, width: 320, maxHeight: 420, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, elevation: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  markAll: { color: '#2563eb', fontWeight: '600' },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  item: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  unreadItem: { backgroundColor: '#f8fafc' },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  itemBody: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemText: { fontSize: 12, color: '#4b5563', marginTop: 2 },
  timeText: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
});

export default NotificationBell;
