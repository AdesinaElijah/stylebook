import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { messagesAPI, ChatMessage } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

/** How often to check for the other party's replies while the thread is open. */
const POLL_INTERVAL_MS = 5000;

/**
 * A single chat thread.
 *
 * Incoming messages are polled rather than pushed. The backend does broadcast over STOMP,
 * but subscribing would mean pulling in a websocket client; polling every few seconds is
 * accurate enough for a conversation and keeps the dependency list short. Push
 * notifications cover the case where the app isn't open.
 */
export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, title, imageUrl } = route.params;
  const { theme } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // A custom headerTitle rather than a plain string, so the shop's photo sits beside its
  // name the way a messaging app is expected to look. Falls back to the first letter for
  // shops with no cover photo.
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerRow}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.headerAvatar, { backgroundColor: theme.surfaceSecondary }]}
            />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: theme.accent }]}>
              <Text style={styles.headerAvatarLetter}>
                {(title || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {title || 'Chat'}
          </Text>
        </View>
      ),
    });
  }, [navigation, title, imageUrl, theme]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await messagesAPI.getMessages(conversationId);
        // Guard against a late response landing after the screen has closed.
        if (active) setMessages(res.data);
      } catch {
        // Transient failure — the next poll will catch up.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft('');
    try {
      const res = await messagesAPI.send(conversationId, body);
      setMessages((current) => [...current, res.data]);
    } catch {
      // Put the text back so the user doesn't lose what they typed.
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubbleRow, item.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View
        style={[
          styles.bubble,
          item.mine
            ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.surface, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.bubbleText, { color: item.mine ? '#000' : theme.text }]}>
          {item.body}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: item.mine ? 'rgba(0,0,0,0.5)' : theme.textTertiary },
          ]}
        >
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );

  return (
    // The bottom inset is left to the composer rather than the screen wrapper: with the
    // keyboard open the home indicator is covered anyway, and insetting both double-spaces
    // the input.
    <ThemedScreen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        // Android needs an explicit behavior. Passing undefined relies on the window
        // resizing itself via adjustResize, which no longer happens under the edge-to-edge
        // mode this app enables — so the keyboard simply covered the composer.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.accent} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              messages.length === 0 && styles.emptyWrap,
            ]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                Say hello — ask about availability, prices or directions.
              </Text>
            }
          />
        )}

        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
            placeholder="Type a message"
            placeholderTextColor={theme.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: draft.trim() ? theme.accent : theme.surfaceSecondary },
            ]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Text style={[styles.sendText, { color: draft.trim() ? '#000' : theme.textTertiary }]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  headerAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  headerAvatarLetter: { color: '#000', fontSize: 14, fontWeight: '800' },
  headerTitle: { fontSize: 17, fontWeight: '800', maxWidth: 220 },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 8 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, maxHeight: 120, marginRight: 8,
  },
  sendBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11 },
  sendText: { fontWeight: '800', fontSize: 14 },
});
