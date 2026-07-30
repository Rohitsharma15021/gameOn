import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../src/components/Avatar';
import { LoadingView } from '../../../src/components/LoadingView';
import { colors, radius, spacing, typography } from '../../../src/theme/theme';
import { fetchMessages, sendMessage } from '../../../src/api/messages';
import { useGameSocket } from '../../../src/hooks/useGameSocket';
import { useAuthStore } from '../../../src/store/auth.store';
import type { Message } from '../../../src/types/api';

export default function GameChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages(id)
      .then((res) => setMessages(res.messages))
      .finally(() => setLoading(false));
  }, [id]);

  const onIncoming = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((existing) => existing.id === m.id) ? prev : [...prev, m]));
  }, []);

  const { connected, typingUser, sendTyping } = useGameSocket(id, onIncoming);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    setSending(true);
    try {
      const message = await sendMessage(id, trimmed);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch {
      // Message may have gone through via the socket even if the REST call errored; ignore.
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Game chat</Text>
        <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : colors.textFaint }]} />
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <MessageBubble message={item} mine={item.senderId === user?.id} />}
        />
      )}

      {typingUser ? <Text style={styles.typing}>{typingUser} is typing...</Text> : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              sendTyping(v.length > 0);
            }}
            placeholder="Message the group..."
            style={styles.input}
            multiline
          />
          <Pressable onPress={submit} disabled={sending || !text.trim()} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      {!mine && <Avatar uri={message.sender.avatarUrl} name={message.sender.name} size={26} />}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!mine && <Text style={styles.senderName}>{message.sender.name}</Text>}
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h3, color: colors.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  list: { padding: spacing.lg, gap: spacing.sm },
  typing: { ...typography.tiny, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.xs },
  bubbleRowMine: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bubbleTheirs: { backgroundColor: colors.bgAlt, borderTopLeftRadius: 2 },
  bubbleMine: { backgroundColor: colors.primary, borderTopRightRadius: 2 },
  senderName: { fontSize: 11, fontWeight: '700', color: colors.primaryDark, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  time: { fontSize: 10, color: colors.textFaint, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: colors.text },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radius.full, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
