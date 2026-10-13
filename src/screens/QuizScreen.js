import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getModuleQuestions, recordAttempt } from '../services/quizzes';
import { recordModuleQuizCompletion } from '../services/progress';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function Choice({ label, letter, state, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        state === 'correct' && styles.choiceCorrect,
        state === 'wrong' && styles.choiceWrong,
        pressed && !disabled && styles.choicePressed,
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
  const { lessons, refresh: refreshProgress } = useProgress();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
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
        const ordered = [...qs].sort((a, b) => {
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
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100;

  async function handleSelect(choiceIndex) {
    if (answered) return;
    setSelected(choiceIndex);
    setAnswered(true);

    const correct = choiceIndex === question.correctIndex;
    if (correct) setScore((s) => s + 1);

    try {
      await recordAttempt({
        questionId: question.id,
        topic: title,
        correct,
        timeTakenMs: Date.now() - questionStart,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleNext() {
    if (isLast) {
      try {
        await recordModuleQuizCompletion(moduleId, score, questions.length);
        // Completion just changed the numbers behind every progress ring, so
        // reload them before the user navigates back to a screen showing one.
        await refreshProgress();
      } catch (err) {
        setError(err.message);
      }
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
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

        <View style={styles.choices}>
          {question.choices.map((choice, choiceIndex) => {
            const isSelected = selected === choiceIndex;
            const isCorrectChoice = choiceIndex === question.correctIndex;

            let state = 'default';
            if (answered && isCorrectChoice) state = 'correct';
            else if (answered && isSelected) state = 'wrong';

            return (
              <Choice
                key={choiceIndex}
                letter={CHOICE_LETTERS[choiceIndex] ?? String(choiceIndex + 1)}
                label={choice}
                state={state}
                disabled={answered}
                onPress={() => handleSelect(choiceIndex)}
              />
            );
          })}
        </View>
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
