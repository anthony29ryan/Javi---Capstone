import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import Blocks, { InlineText } from '../components/LessonBlocks';
import Mascot from '../components/Mascot';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { PASS_PERCENT, useProgress } from '../context/ProgressContext';
import { useScaledStyles } from '../context/TextSizeContext';
import { getModuleQuestions, gradeAnswer } from '../services/quizzes';
import { pickQuizQuestions } from '../services/quizOrder';
import { recordModuleQuizCompletion } from '../services/progress';
import { authColors } from '../theme/authTheme';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
// Questions asked per attempt, drawn at random from the module's pool (about
// 25) so retakes differ. scripts/verifyContent.js warns below this many.
const QUIZ_LENGTH = 20;

const KIND_LABELS = {
  mcq: 'Multiple choice',
  truefalse: 'True or false',
  output: 'What does this print?',
};

// The reading text the Settings text size applies to.
const READING_STYLES = ['kind', 'prompt', 'choiceText', 'choiceTextCode', 'feedbackBody', 'reviewPrompt', 'reviewAnswer'];

const letterFor = (index) => CHOICE_LETTERS[index] ?? String(index + 1);
// Choices that read as code get the design's smaller size.
const looksLikeCode = (label) => /[;(\[`]/.test(label);

function Choice({ label, letter, state, onPress, disabled }) {
  const reading = useScaledStyles(styles, READING_STYLES);
  const mark = state === 'correct' ? '✓' : state === 'wrong' ? '✕' : letter;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected', disabled }}
      style={[
        styles.choice,
        state === 'selected' && styles.choiceSelected,
        state === 'correct' && styles.choiceCorrect,
        state === 'wrong' && styles.choiceWrong,
      ]}
    >
      <View
        style={[
          styles.ring,
          state === 'selected' && styles.ringSelected,
          state === 'correct' && styles.ringCorrect,
          state === 'wrong' && styles.ringWrong,
        ]}
      >
        <Text
          style={[
            styles.ringText,
            state === 'selected' && styles.textSelected,
            state === 'correct' && styles.textCorrect,
            state === 'wrong' && styles.textWrong,
          ]}
        >
          {mark}
        </Text>
      </View>
      <InlineText
        value={label}
        style={[
          reading.choiceText,
          looksLikeCode(label) && reading.choiceTextCode,
          state === 'selected' && styles.textSelected,
          state === 'correct' && styles.textCorrect,
          state === 'wrong' && styles.textWrong,
        ]}
      />
    </Pressable>
  );
}

function CloseButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Quit quiz"
      hitSlop={8}
      style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
    >
      <Text style={styles.closeGlyph}>✕</Text>
    </Pressable>
  );
}

/** Frame 37's loading state. */
function QuizSkeleton({ top }) {
  return (
    <View style={[styles.screen, styles.content, { paddingTop: top }]}>
      <View style={styles.header}>
        <Skeleton style={styles.skelClose} />
        <View style={styles.headerMiddle}>
          <Skeleton style={styles.skelName} />
          <Skeleton style={styles.skelTrack} />
        </View>
      </View>
      <Skeleton style={styles.skelKind} />
      <Skeleton style={[styles.skelPrompt, { width: '92%' }]} />
      <Skeleton style={[styles.skelPrompt, { width: '60%' }]} />
      <View style={styles.choices}>
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} style={styles.skelChoice} />
        ))}
      </View>
    </View>
  );
}

/**
 * Frame 72, and a load failure while online. A cloud function grades every
 * answer, so unlike the design a quiz cannot run offline at all.
 */
function QuizLoadError({ top, bottom, offline, onRetry, onBack }) {
  return (
    <View style={[styles.screen, styles.content, styles.errorPage, { paddingTop: top, paddingBottom: bottom + spacing.xl }]}>
      <View style={styles.errorCentre}>
        <Mascot variant={offline ? 'sleepy' : 'confused'} px={120} decorative animate={false} />
        <Text style={styles.errorTitle}>{offline ? 'Quizzes need internet' : 'Quiz did not load'}</Text>
        <Text style={styles.errorBody}>
          {offline
            ? "Javi checks each answer on the server, so a quiz can't run offline. Lessons in downloaded modules still open."
            : 'Something went wrong loading the questions. Try again in a minute.'}
        </Text>
      </View>
      <AuthButton label="Try again" onPress={onRetry} />
      <AuthButton label="Back" variant="secondary" onPress={onBack} style={styles.secondaryGap} />
    </View>
  );
}

export default function QuizScreen({ route, navigation }) {
  const { moduleId, title } = route.params;
  const insets = useSafeAreaInsets();
  const { lessons, modules, offline, reloadProgress } = useProgress();
  const reading = useScaledStyles(styles, READING_STYLES);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  // One per answered question: { correct, answer, picked, questionId, attemptId },
  // answer being the index of the right choice as the server reports it, and
  // questionId + attemptId naming the graded attempt that finishQuiz counts.
  const [marks, setMarks] = useState([]);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  // Frame 98: the score did not reach the account.
  const [unsynced, setUnsynced] = useState(false);

  // The lessons are read through a ref so that `load` does not depend on them.
  // ProgressContext replaces its lesson list on every refresh (the connection
  // coming back, or a tap on the offline banner). Drawing again then swapped in
  // a new random set mid-quiz while `index` and `marks` still belonged to the
  // old one: the review paired answers with the wrong questions, and a repeated
  // question made finishQuiz refuse the score for good. So a set is drawn once
  // per visit. "Try again" after a failed load, and Retake (a fresh screen),
  // still draw a new one.
  const lessonsRef = useRef(lessons);
  useEffect(() => {
    lessonsRef.current = lessons;
  }, [lessons]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    getModuleQuestions(moduleId)
      .then((qs) => {
        setQuestions(pickQuizQuestions(qs, lessonsRef.current, { length: QUIZ_LENGTH }));
        setQuestionStart(Date.now());
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [moduleId]);

  useEffect(load, [load]);

  const inQuestion = !loading && !loadFailed && questions.length > 0 && !finished;
  // Frame 38. The app keeps a module's last score, and each checked answer is
  // already recorded by the grading function, hence this copy rather than the
  // design's "best score" line.
  const openQuit = useCallback(
    () =>
      navigation.navigate('LeaveSheet', {
        title: 'Quit this quiz?',
        body: "Your score for this attempt won't be saved. Answers you've already checked still count toward Javi's suggestions.",
        confirmLabel: 'Quit quiz',
        keepLabel: 'Keep going',
      }),
    [navigation]
  );

  // Android back asks first, like ✕, while a question is on screen.
  useFocusEffect(
    useCallback(() => {
      if (!inQuestion) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        openQuit();
        return true;
      });
      return () => sub.remove();
    }, [inQuestion, openQuit])
  );

  const top = insets.top + spacing.lg;
  const moduleTitle = modules.find((item) => item.id === moduleId)?.title ?? title;

  if (loading) return <QuizSkeleton top={top} />;
  if (loadFailed) {
    return (
      <QuizLoadError
        top={top}
        bottom={insets.bottom}
        offline={offline}
        onRetry={load}
        onBack={() => navigation.goBack()}
      />
    );
  }
  if (questions.length === 0) {
    return (
      <ScreenState
        message="No quiz questions yet."
        hint="Questions have not been written for this topic."
      />
    );
  }

  const correctCount = marks.filter((mark) => mark.correct).length;

  async function saveScore() {
    setSavingScore(true);
    try {
      await recordModuleQuizCompletion(
        moduleId,
        marks.map(({ questionId, attemptId }) => ({ questionId, attemptId }))
      );
      // Completion just changed the numbers behind every progress ring, so
      // reload them before the user navigates back to a screen showing one.
      await reloadProgress();
      setUnsynced(false);
    } catch {
      setUnsynced(true);
    } finally {
      setSavingScore(false);
    }
  }

  if (finished) {
    const percent = Math.round((correctCount / questions.length) * 100);
    const passed = percent >= PASS_PERCENT;
    // Missed first, each keeping its number from the quiz.
    const review = questions
      .map((question, i) => ({ question, mark: marks[i], n: i + 1 }))
      .sort((a, b) => Number(a.mark.correct) - Number(b.mark.correct));

    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: top, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {unsynced ? (
          <View style={styles.warn} accessibilityRole="alert">
            <View style={styles.warnDot} />
            <Text style={styles.warnText}>
              <Text style={styles.warnLead}>Score not saved yet.</Text> Your answers were recorded,
              but this score didn't reach your account.{' '}
              <Text style={styles.warnLink} onPress={savingScore ? undefined : saveScore}>
                {savingScore ? 'Saving…' : 'Try saving again'}
              </Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Mascot variant={passed ? 'celebrate' : 'encourage'} px={120} animate={false} />
          <Text style={styles.heroName}>{moduleTitle}</Text>
          <Text style={styles.heroPercent}>{percent}%</Text>
          <Text style={styles.heroLine}>
            {correctCount} of {questions.length} correct
          </Text>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>What next</Text>
          <Text style={styles.nextBody}>
            {passed
              ? 'Strong result. Javi uses your recent answers to pick what Home recommends, so this module usually drops out of it.'
              : "Review this module's lessons, then retake. Each retake draws 20 questions at random."}
          </Text>
        </View>

        <Text style={styles.reviewTitle}>Review</Text>
        <View style={styles.reviewList}>
          {review.map(({ question, mark, n }) => (
            <View
              key={question.id}
              style={[styles.reviewCard, { borderLeftColor: mark.correct ? colors.success : colors.error }]}
            >
              <View style={styles.reviewHead}>
                <Text style={styles.reviewNumber}>Question {n}</Text>
                <Text style={[styles.reviewVerdict, { color: mark.correct ? colors.success : colors.error }]}>
                  {mark.correct ? 'Correct' : 'Missed'}
                </Text>
              </View>
              <InlineText value={question.prompt} style={reading.reviewPrompt} />
              <InlineText
                value={`Answer: ${letterFor(mark.answer)} · ${question.choices[mark.answer] ?? ''}`}
                style={reading.reviewAnswer}
              />
            </View>
          ))}
        </View>

        <View style={styles.resultButtons}>
          <AuthButton
            label="Retake"
            variant="secondary"
            onPress={() => navigation.replace('Quiz', route.params)}
            style={styles.resultButton}
          />
          <AuthButton label="Done" onPress={() => navigation.goBack()} style={styles.resultButton} />
        </View>
      </ScrollView>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const mark = marks[index];
  const graded = Boolean(mark);
  const progress = ((index + (graded ? 1 : 0)) / questions.length) * 100;

  async function submit() {
    if (selected === null || grading) return;
    setGrading(true);
    setGradeError('');
    // Same for a retry of this question, new for the next, so a retry after a
    // lost reply gets that attempt's verdict back rather than adding one.
    const attemptId = String(questionStart);
    try {
      const verdict = await gradeAnswer({
        questionId: question.id,
        choice: selected,
        timeTakenMs: Date.now() - questionStart,
        attemptId,
      });
      // `choice` is the one the server graded, which on a retry may be the first pick.
      setMarks((current) => [
        ...current,
        { correct: verdict.correct, answer: verdict.answer, picked: verdict.choice ?? selected, questionId: question.id, attemptId },
      ]);
    } catch (err) {
      // No verdict came back, so keep the choice and let them submit again
      // rather than ending the whole quiz over one dropped request.
      setGradeError(
        // A limit (per minute or per day): the server's message says how long to wait.
        err.code === 'functions/resource-exhausted'
          ? err.message
          : offline
            ? "Your answer wasn't checked. Reconnect and submit it again."
            : 'Could not check that answer. Try submitting again.'
      );
    } finally {
      setGrading(false);
    }
  }

  async function next() {
    if (isLast) {
      await saveScore();
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setQuestionStart(Date.now());
  }

  const actionLabel = graded ? (isLast ? 'See results' : 'Next question') : 'Submit answer';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: top, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <OfflineBanner message="Javi can't check answers until you reconnect." />

      <View style={styles.header}>
        <CloseButton onPress={openQuit} />
        <View style={styles.headerMiddle}>
          <Text style={styles.headerName} numberOfLines={1}>
            {moduleTitle}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <Mascot variant="focused" px={36} decorative animate={false} />
          <Text style={styles.counter}>
            {index + 1}/{questions.length}
          </Text>
        </View>
      </View>

      <Text style={reading.kind}>{KIND_LABELS[question.type] ?? 'Question'}</Text>
      <InlineText value={question.prompt} style={reading.prompt} />

      {/* "What does this print?" questions carry the code to read in `code`;
          reuse the lesson code block so it looks the same as in a lesson. */}
      {question.code ? (
        <View style={styles.codeWrap}>
          <Blocks blocks={[{ type: 'code', language: 'java', value: question.code }]} />
        </View>
      ) : null}

      <View style={styles.choices} accessibilityRole="radiogroup">
        {question.choices.map((choice, choiceIndex) => {
          let state = 'default';
          if (graded && choiceIndex === mark.answer) state = 'correct';
          else if (graded && choiceIndex === mark.picked) state = 'wrong';
          else if (!graded && selected === choiceIndex) state = 'selected';

          return (
            <Choice
              key={choiceIndex}
              letter={letterFor(choiceIndex)}
              label={choice}
              state={state}
              disabled={graded || grading}
              onPress={() => setSelected(choiceIndex)}
            />
          );
        })}
      </View>

      {/* Frames 109 and 110. The questions carry no explanation, so the card
          names the right answer instead of the design's "why" text. */}
      {graded ? (
        <View style={[styles.feedback, mark.correct ? styles.feedbackRight : styles.feedbackWrong]}>
          <View style={styles.feedbackHead}>
            <Mascot variant={mark.correct ? 'celebrate' : 'encourage'} px={40} decorative animate={false} />
            <Text style={[styles.feedbackTitle, { color: mark.correct ? colors.success : colors.error }]}>
              {mark.correct ? 'Correct' : 'Not quite'}
            </Text>
          </View>
          <InlineText
            value={`The answer is ${letterFor(mark.answer)} · ${question.choices[mark.answer] ?? ''}`}
            style={reading.feedbackBody}
          />
        </View>
      ) : null}

      {gradeError ? <Text style={styles.gradeError}>{gradeError}</Text> : null}

      <AuthButton
        label={actionLabel}
        onPress={graded ? next : submit}
        loading={grading || savingScore}
        disabled={!graded && selected === null}
        style={styles.action}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    backgroundColor: colors.primarySoft,
  },
  closeGlyph: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  headerMiddle: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunken,
    marginTop: 9,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counter: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  kind: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    marginTop: 22,
  },
  prompt: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.4,
    letterSpacing: -0.2,
    color: colors.text,
    marginTop: 12,
    marginBottom: 18,
  },
  codeWrap: {
    marginBottom: 18,
  },
  choices: {
    gap: 10,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  choiceSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  choiceCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  choiceWrong: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSelected: {
    borderColor: colors.primary,
  },
  ringCorrect: {
    borderColor: colors.success,
  },
  ringWrong: {
    borderColor: colors.error,
  },
  ringText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.text,
  },
  choiceText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.45,
    color: colors.text,
  },
  choiceTextCode: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
  },
  textSelected: {
    color: colors.primaryDark,
  },
  textCorrect: {
    color: colors.success,
  },
  textWrong: {
    color: colors.error,
  },
  feedback: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
  },
  feedbackRight: {
    backgroundColor: colors.successBg,
  },
  feedbackWrong: {
    backgroundColor: colors.errorBg,
  },
  feedbackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.06,
    textTransform: 'uppercase',
  },
  feedbackBody: {
    ...type.body,
    fontSize: 13.5,
    color: colors.text,
    marginTop: 10,
  },
  gradeError: {
    ...type.small,
    color: colors.error,
    marginTop: spacing.lg,
  },
  action: {
    marginTop: 20,
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: authColors.warnSoft,
    borderWidth: 1,
    borderColor: authColors.warnLine,
    marginBottom: 14,
  },
  warnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    backgroundColor: authColors.warn,
  },
  warnText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: authColors.warnInk,
  },
  warnLead: {
    fontFamily: fonts.bold,
  },
  warnLink: {
    fontFamily: fonts.bold,
    textDecorationLine: 'underline',
  },
  hero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.primary,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 4,
  },
  heroName: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 10 * 0.14,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.82)',
    marginTop: 12,
    textAlign: 'center',
  },
  heroPercent: {
    fontFamily: fonts.bold,
    fontSize: 54,
    lineHeight: 60,
    color: colors.white,
    marginTop: 12,
  },
  heroLine: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  nextCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  nextBody: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.6,
    color: colors.textMuted,
    marginTop: 9,
  },
  reviewTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  reviewList: {
    gap: 10,
  },
  reviewCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewNumber: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  reviewVerdict: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 10 * 0.08,
    textTransform: 'uppercase',
  },
  reviewPrompt: {
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.text,
    marginTop: 9,
  },
  reviewAnswer: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.6,
    color: colors.textMuted,
    marginTop: 7,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  resultButton: {
    flex: 1,
  },
  errorPage: {
    flex: 1,
  },
  errorCentre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.text,
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  errorBody: {
    ...type.body,
    maxWidth: 290,
    color: colors.textMuted,
    textAlign: 'center',
  },
  secondaryGap: {
    marginTop: 12,
  },
  skelClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skelName: {
    width: '50%',
    height: 10,
    borderRadius: 5,
  },
  skelTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 9,
  },
  skelKind: {
    width: 110,
    height: 10,
    borderRadius: 5,
    marginTop: 24,
    marginBottom: 14,
  },
  skelPrompt: {
    height: 20,
    borderRadius: 7,
    marginBottom: 10,
  },
  skelChoice: {
    height: 52,
    borderRadius: 18,
  },
});
