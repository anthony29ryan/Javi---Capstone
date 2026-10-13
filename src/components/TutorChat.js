import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { askTutor, getTutorThread } from '../services/tutor';
import { colors, fonts, radius, spacing } from '../theme/colors';

const MAX_QUESTION_CHARS = 500; // keep in step with functions/index.js

function suggestions(topic) {
  return [
    { label: 'Explain this', question: `Explain "${topic}" in simple terms.` },
    { label: 'Give me an example', question: `Give me a small Java example for "${topic}".` },
    { label: 'Give me a hint', question: `Give me a hint to help me understand "${topic}" without giving everything away.` },
  ];
}

/**
 * The tutor chat, used at the bottom of a lesson and on the Tutor tab. The
 * question goes to the askTutor Cloud Function, which keeps the answer on this
 * module's lessons and saves the conversation. The thread is one per module,
 * so it is the same from any of the module's lessons and from the tab.
 *
 * `topic` is what the suggestion chips ask about (a lesson or module title).
 * `shownMessages` caps how much of the saved thread is shown; a lesson page
 * only needs the recent part.
 */
export default function TutorChat({ moduleId, topic, heading = 'Ask about this lesson', shownMessages = 10 }) {
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Set the moment a question goes out. `sending` only takes effect on the
  // next render, so a quick double tap could otherwise send twice.
  const inFlight = useRef(false);
  // Until the saved thread arrives, a new message would be wiped by it.
  const busy = sending || loadingThread;

  useEffect(() => {
    setLoadingThread(true);
    getTutorThread(moduleId)
      .then(setMessages)
      // A missing history is not worth blocking questions over.
      .catch(() => setMessages([]))
      .finally(() => setLoadingThread(false));
  }, [moduleId]);

  async function send(question) {
    const trimmed = question.trim();
    if (!trimmed || inFlight.current || loadingThread) return;

    inFlight.current = true;
    setSending(true);
    setError('');
    setMessages((current) => [...current, { role: 'learner', text: trimmed }]);
    setText('');

    try {
      const reply = await askTutor(moduleId, trimmed);
      setMessages((current) => [...current, { role: 'tutor', text: reply }]);
    } catch (err) {
      // Take the unanswered question back out and hand the text back to edit.
      setMessages((current) => current.slice(0, -1));
      setText(trimmed);
      // The daily-limit message is written for the learner; the rest are not.
      setError(
        err.code === 'functions/resource-exhausted'
          ? err.message
          : 'The tutor could not answer right now. Check your connection and try again.'
      );
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar} />
        <View style={styles.headText}>
          <Text style={styles.title}>{heading}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            The tutor only answers on this module
          </Text>
        </View>
      </View>

      {loadingThread ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}

      {messages.slice(-shownMessages).map((message, index) => (
        <View key={index} style={[styles.bubble, message.role === 'learner' ? styles.bubbleLearner : styles.bubbleTutor]}>
          <Text style={[styles.bubbleText, message.role === 'learner' && styles.bubbleTextLearner]}>
            {message.text}
          </Text>
        </View>
      ))}

      {sending ? <Text style={styles.thinking}>Tutor is thinking…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.chips}>
        {suggestions(topic).map(({ label, question }) => (
          <Pressable
            key={label}
            onPress={() => send(question)}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, (busy || pressed) && styles.dimmed]}
          >
            <Text style={styles.chipLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send(text)}
          editable={!sending}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Type your question…"
          placeholderTextColor={colors.borderStrong}
          returnKeyType="send"
          accessibilityLabel="Question for the tutor"
          style={styles.input}
        />
        <Pressable
          onPress={() => send(text)}
          disabled={busy || !text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          style={({ pressed }) => [styles.send, (busy || !text.trim() || pressed) && styles.dimmed]}
        >
          <Text style={styles.sendGlyph}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 22,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.2,
    color: colors.primaryDark,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.primaryDark,
    marginTop: 3,
  },
  loading: {
    marginTop: spacing.md,
  },
  bubble: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: '90%',
  },
  bubbleTutor: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleLearner: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.45,
    color: colors.text,
  },
  bubbleTextLearner: {
    color: colors.white,
  },
  thinking: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.error,
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 14,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  dimmed: {
    opacity: 0.55,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.text,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.white,
  },
});
