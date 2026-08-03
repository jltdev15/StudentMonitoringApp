import type {QuizAnswer, QuizDocument, QuizQuestion} from '../types';

export function quizOptionEntries(question: QuizQuestion | undefined): Array<[string, QuizAnswer]> {
  const options = question?.options ?? question?.choices;
  if (Array.isArray(options)) return options.map((option, index) => [String(index), option]);
  if (options && typeof options === 'object') return Object.entries(options);
  return [];
}

export function extractQuestions(data: QuizDocument | null | undefined): QuizQuestion[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const key of ['questions', 'items', 'data', 'quiz'] as const) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function normalizedAnswer(value: QuizAnswer | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export function isCorrectAnswer(question: QuizQuestion, answer: QuizAnswer | undefined) {
  const key = question.answer ?? question.correctAnswer ?? question.correct;
  if (key === undefined || key === null || answer === undefined || answer === null) return false;
  if (normalizedAnswer(answer) === normalizedAnswer(key)) return true;
  const options = question.options ?? question.choices ?? [];
  const indexed = Array.isArray(options) ? options[Number(key)] : options[String(key)];
  return indexed !== undefined && normalizedAnswer(indexed) === normalizedAnswer(answer);
}

export function scoreQuiz(data: QuizDocument | null | undefined, answers: Record<string, QuizAnswer>, totalPoints: number) {
  const questions = extractQuestions(data);
  const correct = questions.reduce((count, question, index) => count + (isCorrectAnswer(question, answers[String(index)]) ? 1 : 0), 0);
  return Math.round((correct / Math.max(questions.length, 1)) * totalPoints);
}
