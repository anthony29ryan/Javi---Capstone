import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text, { AppTextInput as TextInput } from './AppText';
import { CodeBlock, InlineText } from './LessonBlocks';
import Mascot from './Mascot';
import Skeleton from './Skeleton';
import { useProgress } from '../context/ProgressContext';
import { askTutor, getTutorThread } from '../services/tutor';
import { authColors } from '../theme/authTheme';
import { colors, fonts, radius, spacing } from '../theme/colors';

const MAX_QUESTION_CHARS = 500; // keep in step with functions/index.js
const DAILY_QUESTIONS = 30; // keep in step with DAILY_QUESTIONS in functions/index.js

// Callable errors that mean the request never reached the tutor.
const CONNECTION_CODES = ['functions/unavailable', 'functions/deadline-exceeded'];

function suggestions(topic) {
  return [
    { label: 'Explain this', question: `Explain "${topic}" in simple terms.` },
    { label: 'Give me an example', question: `Give me a small Java example for "${topic}".` },
    { label: 'Quiz me', question: `Ask me one short practice question about "${topic}", then check my answer.` },
    { label: 'When do I use it?', question: `When and why would I use "${topic}" in a real Java program?` },
  ];
}

/**
 * Javi's reply: plain text with `inline code`, and ```java blocks shown in the
 * lesson code box. The split puts text, fence language and code in turn.
 */
function TutorReply({ text }) {
  const parts = text.split(/```(\w*)\n?([\s\S]*?)\n?```/);
  return (
    <View style={styles.reply}>
      {parts.map((part, index) => {
        if (index % 3 === 1) return null; // the fence language, used by the code after it
        if (index % 3 === 2) return <CodeBlock key={index} value={part} language={parts[index - 1] || 'java'} />;
        return part.trim() ? <InlineText key={index} value={part.trim()} style={styles.bubbleText} /> : null;
      })}
    </View>
  );
}

/**
 * The tutor chat, used in a lesson's Ask Javi sheet and on the Tutor tab. The
 * question goes to the askTutor Cloud Function, which keeps the answer on this
 * module's lessons and saves the conversation. The thread is one per module,
 * so it is the same from any of the module's lessons and from the tab.
 *
 * `topic` is what the suggestion chips ask about (a lesson or module title).
 * `shownMessages` caps how much of the saved thread is shown; the lesson
 * sheet only needs the recent part. It fills its parent, with `header` above
 * the thread and an `emptyState` for new threads.
 */
export default function TutorChat({
  moduleId,
  topic,
  shownMessages = 10,
  header = null,
  emptyState = false,
}) {
  const { offline } = useProgress();
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // { connection } for the last question, which stays in the list marked failed.
  const [failure, setFailure] = useState(null);
  // The function refused for the day. The app cannot read the count itself,
  // so this is only known after a refusal.
  const [limitReached, setLimitReached] = useState(false);
  // Set the moment a question goes out. `sending` only takes effect on the
  // next render, so a quick double tap could otherwise send twice.
  const inFlight = useRef(false);
  const scrollRef = useRef(null);
  // Until the saved thread arrives, a new message would be wiped by it.
  const busy = sending || loadingThread || offline;

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
    setFailure(null);
    // A new question replaces one that failed.
    setMessages((current) => [
      ...current.filter((message) => !message.failed),
      { role: 'learner', text: trimmed },
    ]);
    setText('');

    try {
      const reply = await askTutor(moduleId, trimmed);
      setMessages((current) => [...current, { role: 'tutor', text: reply }]);
    } catch (err) {
      if (err.code === 'functions/resource-exhausted' && /Slow down/.test(err.message)) {
        // The 5-a-minute limit: kept, dimmed, to send again in a moment.
        setMessages((current) => [...current.slice(0, -1), { role: 'learner', text: trimmed, failed: true }]);
        setFailure({ tooFast: true });
      } else if (err.code === 'functions/resource-exhausted') {
        // Nothing to retry until a question frees up, so it is taken back out.
        setMessages((current) => current.slice(0, -1));
        setLimitReached(true);
      } else {
        // Kept, dimmed, so it can be sent again. The function refunds it.
        setMessages((current) => [...current.slice(0, -1), { role: 'learner', text: trimmed, failed: true }]);
        setFailure({ connection: offline || CONNECTION_CODES.includes(err.code) });
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  const shown = messages.slice(-shownMessages);
  const failedText = messages.find((message) => message.failed)?.text;

  const thread = (
    <>
      {/* A short exchange in grey while the saved chat loads. */}
      {loadingThread ? (
        <>
          <View style={[styles.bubble, styles.bubbleTutor, styles.skelBubble, { width: '72%' }]}>
            <Skeleton style={styles.skelLine} />
            <Skeleton style={[styles.skelLine, { width: '60%' }]} />
          </View>
          <Skeleton style={[styles.bubble, styles.skelLearner]} />
          <View style={[styles.bubble, styles.bubbleTutor, styles.skelBubble, { width: '80%' }]}>
            <Skeleton style={styles.skelLine} />
            <Skeleton style={styles.skelLine} />
            <Skeleton style={[styles.skelLine, { width: '45%' }]} />
          </View>
        </>
      ) : null}

      {emptyState && !loadingThread && messages.length === 0 ? (
        <View style={styles.empty}>
          <Mascot variant="curious" px={120} decorative animate={false} />
          <Text style={styles.emptyTitle}>Ask your first question</Text>
          <Text style={styles.emptyBody}>
            Javi answers on this module only. Pick a starter below or type your own.
          </Text>
        </View>
      ) : null}

      {shown.map((message, index) => (
        <View
          key={index}
          style={[
            styles.bubble,
            message.role === 'learner' ? styles.bubbleLearner : styles.bubbleTutor,
            message.failed && styles.bubbleFailed,
          ]}
        >
          {message.role === 'learner' ? (
            <Text style={[styles.bubbleText, styles.bubbleTextLearner]}>{message.text}</Text>
          ) : (
            <TutorReply text={message.text} />
          )}
        </View>
      ))}

      {/* Frame 104. */}
      {sending ? (
        <View style={styles.thinkingRow} accessibilityLabel="Javi is writing a reply">
          <View style={[styles.bubble, styles.bubbleTutor, styles.dots]}>
            {[1, 0.7, 0.45].map((opacity) => (
              <View key={opacity} style={{ opacity }}>
                <Skeleton style={styles.dot} />
              </View>
            ))}
          </View>
          <Text style={styles.thinkingText}>Javi is thinking…</Text>
        </View>
      ) : null}

      {/* Frame 73. */}
      {failure && failedText ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            {failure.connection ? 'Not sent · no connection' : failure.tooFast ? 'Not sent · too fast' : 'Not sent'}
          </Text>
          <Text style={styles.errorBody}>
            {failure.connection
              ? 'Your question stays here. Send it again when you are back online.'
              : failure.tooFast
                ? 'You can ask 5 questions a minute. Wait a moment, then try again.'
                : 'Javi could not answer right now. Try again in a moment.'}
          </Text>
          <Pressable
            onPress={() => send(failedText)}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.errorRetry, (busy || pressed) && styles.dimmed]}
          >
            <Text style={styles.errorRetryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  // Frame 105: replaces the chips and composer once the function refuses.
  const controls = limitReached ? (
    <View style={styles.limitCard} accessibilityRole="text">
      <Mascot variant="sleepy" px={56} decorative animate={false} style={styles.limitMascot} />
      <Text style={styles.limitEyebrow}>
        {DAILY_QUESTIONS} of {DAILY_QUESTIONS} questions used
      </Text>
      <Text style={styles.limitTitle}>Daily question limit reached</Text>
      <Text style={styles.limitBody}>
        Your questions reset at midnight. Lessons and quizzes still work.
      </Text>
      <View style={styles.limitBar} />
    </View>
  ) : (
    <>
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

      <View style={[styles.composer, offline && styles.composerOffline]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send(text)}
          editable={!sending && !offline}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={offline ? 'Reconnect to ask Javi' : 'Ask about this module…'}
          placeholderTextColor={colors.borderStrong}
          returnKeyType="send"
          accessibilityLabel="Question for Javi"
          style={styles.input}
        />
        <Pressable
          onPress={() => send(text)}
          disabled={busy || !text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          style={({ pressed }) => [
            styles.send,
            pressed && styles.sendPressed,
            (busy || !text.trim()) && styles.dimmed,
          ]}
        >
          <Text style={styles.sendGlyph}>↑</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={styles.fullScreen}>
      {header}
      <ScrollView
        ref={scrollRef}
        style={styles.fullThread}
        contentContainerStyle={styles.fullThreadContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {thread}
      </ScrollView>
      {controls}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  fullThread: {
    flex: 1,
  },
  fullThreadContent: {
    flexGrow: 1,
    paddingVertical: spacing.lg,
  },
  skelBubble: {
    gap: 8,
  },
  skelLine: {
    height: 11,
    borderRadius: 5,
  },
  skelLearner: {
    alignSelf: 'flex-end',
    width: '46%',
    height: 44,
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.text,
    marginTop: 22,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 270,
    marginTop: spacing.sm,
  },
  bubble: {
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 18,
    maxWidth: '84%',
  },
  bubbleTutor: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleLearner: {
    alignSelf: 'flex-end',
    backgroundColor: colors.button,
  },
  bubbleFailed: {
    opacity: 0.55,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.6,
    color: colors.text,
  },
  bubbleTextLearner: {
    color: colors.white,
  },
  reply: {
    gap: spacing.sm,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  thinkingText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 12,
  },
  errorCard: {
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: authColors.errorLine,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: colors.error,
  },
  errorBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.text,
  },
  errorRetry: {
    marginTop: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: authColors.errorLine,
  },
  errorRetryLabel: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
    color: colors.error,
  },
  limitCard: {
    gap: 6,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitMascot: {
    marginTop: -4,
    marginLeft: -4,
    marginBottom: 2,
  },
  limitEyebrow: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  limitTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 15 * 1.35,
    color: colors.text,
  },
  limitBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.textMuted,
  },
  limitBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  dimmed: {
    opacity: 0.55,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  composerOffline: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  send: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPressed: {
    backgroundColor: colors.buttonPressed,
  },
  sendGlyph: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.white,
  },
});
