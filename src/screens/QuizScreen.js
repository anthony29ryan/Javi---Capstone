import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import Blocks from '../components/LessonBlocks';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getModuleQuestions, gradeAnswer } from '../services/quizzes';
import { recordModuleQuizCompletion } from '../services/progress';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
// Questions asked per attempt, drawn at random from the module's pool (about
// 25) so retakes differ. scripts/verifyContent.js warns below this many.
const QUIZ_LENGTH = 20;

function Choice({ label, letter, state, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        state === 'correct' && styles.choiceCorrect,
        state === 'wrong' && styles.choiceWrong,
        // Chosen and waiting for the server's verdict.
        (state === 'pending' || (pressed && !disabled)) && styles.choicePressed,
      ]}
    >
      <View
        style={[
          styles.letterBadge,
          state === 'correct' && styles.letterBadgeCorrect,
          state === 'wrong' && styles.letterBadgeWrong,
        ]}
      >
        <Text
          style={[
            styles.letterText,
            (state === 'correct' || state === 'wrong') && styles.letterTextRevealed,
          ]}
        >
          {letter}
        </Text>
      </View>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

export default function QuizScreen({ route, navigation }) {
  const { moduleId, title } = route.params;
  const { lessons, reloadProgress } = useProgress();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  // The server's verdict on the selected choice: { correct, answer }.
  const [result, setResult] = useState(null);
  const [gradeError, setGradeError] = useState('');
  const [score, setScore] = useState(0);
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  useEffect(() => {
    // A module quiz is every lesson's questions put together, so they have to
    // be ordered by which lesson they came from first — a question's own
    // `order` only ranks it within its own lesson. Anything written at module
    // level rather than against a lesson sits at the end.
    const lessonOrder = new Map(lessons.map((lesson) => [lesson.id, lesson.order ?? 0]));

    getModuleQuestions(moduleId)
      .then((qs) => {
        const picked = qs
          .map((question) => ({ question, key: Math.random() }))
          .sort((a, b) => a.key - b.key)
          .slice(0, QUIZ_LENGTH)
          .map(({ question }) => question);

        const ordered = picked.sort((a, b) => {
          const lessonDelta =
            (a.lessonId ? (lessonOrder.get(a.lessonId) ?? 0) : Number.MAX_SAFE_INTEGER) -
            (b.lessonId ? (lessonOrder.get(b.lessonId) ?? 0) : Number.MAX_SAFE_INTEGER);
          return lessonDelta !== 0 ? lessonDelta : (a.order ?? 0) - (b.order ?? 0);
        });

        setQuestions(ordered);
        setQuestionStart(Date.now());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleId, lessons]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (questions.length === 0) {
    return (
      <ScreenState
        message="No quiz questions yet."
        hint="Questions have not been written for this topic."
      />
    );
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Quiz complete</Text>
        <Text style={styles.resultScore}>
          {score}
          <Text style={styles.resultScoreTotal}>/{questions.length}</Text>
        </Text>
        <Text style={styles.resultPercent}>{percent}% correct</Text>
        <Button label="Done" onPress={() => navigation.goBack()} style={styles.resultButton} />
      </View>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = result !== null;
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100;

  async function handleSelect(choiceIndex) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    setGradeError('');

    try {
      const graded = await gradeAnswer({
        questionId: question.id,
        choice: choiceIndex,
        timeTakenMs: Date.now() - questionStart,
      });
      if (graded.correct) setScore((s) => s + 1);
      setResult(graded);
    } catch {
      // No verdict came back, so free the choices and let them try again
      // rather than ending the whole quiz over one dropped request.
      setSelected(null);
      setGradeError('Could not check that answer. Check your connection and try again.');
    }
  }

  async function handleNext() {
    if (isLast) {
      try {
        await recordModuleQuizCompletion(moduleId, score, questions.length);
        // Completion just changed the numbers behind every progress ring, so
        // reload them before the user navigates back to a screen showing one.
        await reloadProgress();
      } catch (err) {
        setError(err.message);
      }
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setResult(null);
    setQuestionStart(Date.now());
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {index + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.prompt}>{question.prompt}</Text>

        {/* "What does this print?" questions carry the code to read in `code`;
            reuse the lesson code block so it looks the same as in a lesson. */}
        {question.code ? (
          <View style={styles.codeWrap}>
            <Blocks blocks={[{ type: 'code', language: 'java', value: question.code }]} />
          </View>
        ) : null}

        <View style={styles.choices}>
          {question.choices.map((choice, choiceIndex) => {
            const isSelected = selected === choiceIndex;

            let state = 'default';
            if (answered && choiceIndex === result.answer) state = 'correct';
            else if (answered && isSelected) state = 'wrong';
            else if (isSelected) state = 'pending';

            return (
              <Choice
                key={choiceIndex}
                letter={CHOICE_LETTERS[choiceIndex] ?? String(choiceIndex + 1)}
                label={choice}
                state={state}
                disabled={selected !== null}
                onPress={() => handleSelect(choiceIndex)}
              />
            );
          })}
        </View>

        {gradeError ? <Text style={styles.gradeError}>{gradeError}</Text> : null}
      </ScrollView>

      {answered ? (
        <View style={styles.footer}>
          <Button
            label={isLast ? 'Finish' : 'Next question'}
            onPress={handleNext}
            style={styles.footerButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progressText: {
    ...type.small,
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  prompt: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  codeWrap: {
    marginBottom: spacing.xl,
  },
  choices: {
    gap: spacing.md,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  choicePressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  choiceCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  choiceWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeCorrect: {
    backgroundColor: colors.success,
  },
  letterBadgeWrong: {
    backgroundColor: colors.error,
  },
  letterText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  letterTextRevealed: {
    color: colors.white,
  },
  gradeError: {
    ...type.small,
    color: colors.error,
    marginTop: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  // The bar spans the screen; the button inside lines up with the answers.
  footerButton: {
    ...centeredColumn(contentWidth.content),
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  resultLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  resultScore: {
    fontSize: 64,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  resultScoreTotal: {
    fontSize: 32,
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
  },
  resultPercent: {
    ...type.body,
    color: colors.textMuted,
  },
  resultButton: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
});
