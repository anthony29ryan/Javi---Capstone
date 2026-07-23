import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getLessonQuestions, getModuleQuestions, recordAttempt } from '../services/quizzes';
import { recordLessonQuizCompletion, recordModuleQuizCompletion } from '../services/progress';

export default function QuizScreen({ route, navigation }) {
  const { mode, refId, title } = route.params;

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
    const fetchQuestions = mode === 'lesson' ? getLessonQuestions(refId) : getModuleQuestions(refId);
    fetchQuestions
      .then((qs) => {
        setQuestions(qs);
        setQuestionStart(Date.now());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, refId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No quiz questions yet.</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Quiz Complete</Text>
        <Text style={styles.score}>
          {score} / {questions.length} correct
        </Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

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
        if (mode === 'lesson') {
          await recordLessonQuizCompletion(refId);
        } else {
          await recordModuleQuizCompletion(refId, score, questions.length);
        }
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
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.progress}>
        Question {index + 1} of {questions.length}
      </Text>
      <Text style={styles.prompt}>{question.prompt}</Text>

      {question.choices.map((choice, choiceIndex) => {
        const isSelected = selected === choiceIndex;
        const isCorrectChoice = choiceIndex === question.correctIndex;
        const showResult = answered && (isSelected || isCorrectChoice);

        return (
          <Pressable
            key={choiceIndex}
            style={[
              styles.choice,
              showResult && isCorrectChoice && styles.choiceCorrect,
              showResult && isSelected && !isCorrectChoice && styles.choiceWrong,
            ]}
            onPress={() => handleSelect(choiceIndex)}
            disabled={answered}
          >
            <Text>{choice}</Text>
          </Pressable>
        );
      })}

      {answered ? (
        <Pressable style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>{isLast ? 'Finish' : 'Next'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  error: {
    color: '#c00',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  progress: {
    color: '#555',
  },
  prompt: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  choice: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  choiceCorrect: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  choiceWrong: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  score: {
    fontSize: 18,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
