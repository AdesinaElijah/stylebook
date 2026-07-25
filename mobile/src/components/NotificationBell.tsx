import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function getIconName(type: string) {
  switch (type) {
    case 'booking_request':
    case 'booking_confirmed':
    case 'booking_cancelled':
      return 'calendar-outline';
    case 'new_message':
      return 'chatbubble-outline';
    case 'payment_received':
      return 'cash-outline';
    case 'new_review':
      return 'star-outline';
    case 'post_like':
    case 'post_comment':
    case 'post_share':
      return 'image-outline';
    default:
      return 'notifications-outline';
  }
}

function getRouteForNotification(notification: NotificationRecord, navigation: any, role?: string) {
  const data = notification.data || {};
  const isOwner = role === 'OWNER';

  if (notification.type.startsWith('booking')) {
    navigation.navigate(isOwner ? 'OwnerBookings' : 'Bookings', {
      bookingId: data.booking_id,
    });
    return;
  }

  if (notification.type === 'new_message') {
    navigation.navigate(isOwner ? 'OwnerBookings' : 'Bookings', { messageId: data.message_id });
    return;
  }

  if (notification.type === 'new_review') {
    navigation.navigate(isOwner ? 'OwnerReviews' : 'MyReviews');
    return;
  }

  if (['post_like', 'post_comment', 'post_share'].includes(notification.type)) {
    navigation.navigate('Feed', { postId: data.post_id });
    return;
  }

  if (notification.type === 'payment_received') {
    navigation.navigate(isOwner ? 'OwnerBookings' : 'Bookings');
  }
}

export default function NotificationBell() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.userId || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (!error) {
      setNotifications((data || []) as NotificationRecord[]);
    } else {
      console.warn('Failed to load notifications', error);
    }
    setLoading(false);
  }, [user?.userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user?.userId || !supabase) return;

    const channel = supabase.channel(`notifications:${user.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.userId}`,
        },
        (payload) => {
          const incoming = payload.new as NotificationRecord;
          setNotifications((prev) => [incoming, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.userId]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const grouped = useMemo(() => {
    const today: NotificationRecord[] = [];
    const earlier: NotificationRecord[] = [];
    const now = Date.now();

    notifications.forEach((n) => {
      const created = new Date(n.created_at).getTime();
      const isToday = created >= now - 24 * 60 * 60 * 1000;
      (isToday ? today : earlier).push(n);
    });

    return { today, earlier };
  }, [notifications]);

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handlePressNotification = async (item: NotificationRecord) => {
    await markAsRead(item.id);
    setVisible(false);
    getRouteForNotification(item, navigation, user?.role);
  };

  const markAllAsRead = async () => {
    if (!supabase || !user?.userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const renderNotification = ({ item }: { item: NotificationRecord }) => (
    <TouchableOpacity
      style={[styles.item, !item.is_read && { backgroundColor: theme.accentLight }]}
      onPress={() => handlePressNotification(item)}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSecondary }]}> 
        <Ionicons name={getIconName(item.type) as any} size={16} color={theme.accent} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        <Text style={[styles.itemBodyText, { color: theme.textSecondary }]} numberOfLines={2}>{item.body}</Text>
        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: NotificationRecord[]) => {
    if (!items.length) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
        {items.map((item) => (
          <View key={item.id}>{renderNotification({ item })}</View>
        ))}
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.surfaceSecondary }]} onPress={() => setVisible(true)}>
        <Ionicons name="notifications-outline" size={18} color={theme.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.panel, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Notifications</Text>
              <TouchableOpacity onPress={markAllAsRead}>
                <Text style={[styles.markAll, { color: theme.accent }]}>Mark all as read</Text>
              </TouchableOpacity>
            </View>

            {loading && !notifications.length ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Loading…</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={28} color={theme.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>You’ll see booking and activity updates here.</Text>
              </View>
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {renderSection('Today', grouped.today)}
                {renderSection('Earlier', grouped.earlier)}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingTop: 70,
    paddingRight: 12,
  },
  panel: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 14,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  markAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    maxHeight: 460,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 11,
  },
  itemBodyText: {
    fontSize: 13,
    lineHeight: 18,
    marginRight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
