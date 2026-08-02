import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { messagesAPI, Conversation } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

/**
 * Inbox — every chat thread the signed-in user is part of.
 *
 * Works for both roles without branching: the backend already resolves who the "other
 * party" is from the caller's perspective, so a customer sees shop names here and an
 * owner sees customer names.
 */
export default function ConversationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setConversations(res.data);
    } catch {
      // Keep whatever is already on screen rather than blanking the inbox.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload on focus so unread badges settle after coming back from a thread.
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /** "14:32" today, "Yesterday", "Mon", then a date once it's over a week old. */
  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(
      (new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / dayMs
    );

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={() =>
        navigation.navigate('Chat', {
          conversationId: item.id,
          title: item.otherPartyName,
        })
      }
    >
      {item.otherPartyImageUrl ? (
        <Image source={{ uri: item.otherPartyImageUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accent }]}>
          <Text style={styles.avatarLetter}>
            {(item.otherPartyName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.otherPartyName}
          </Text>
          <Text style={[styles.time, { color: theme.textTertiary }]}>
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.rowTop}>
          <Text
            style={[
              styles.preview,
              { color: item.unreadCount > 0 ? theme.text : theme.textSecondary },
              item.unreadCount > 0 && styles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.accent} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={conversations.length === 0 && styles.emptyWrap}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Open a shop's profile and tap Message to start a conversation.
              </Text>
            </View>
          }
        />
      )}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900' },
  loader: { marginTop: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#000', fontSize: 20, fontWeight: '900' },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  preview: { fontSize: 14, flex: 1, marginRight: 8, marginTop: 3 },
  previewUnread: { fontWeight: '600' },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
