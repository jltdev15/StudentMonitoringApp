import {extractQuestions, isCorrectAnswer, quizOptionEntries, scoreQuiz} from './quiz';

describe('quiz domain', () => {
  const questions = [{question: 'One?', options: ['A', 'B'], answer: 1}, {question: 'Two?', choices: ['yes', 'no'], correctAnswer: 'yes'}];

  it('accepts legacy JSON containers', () => {
    expect(extractQuestions({items: questions})).toEqual(questions);
    expect(extractQuestions(questions)).toEqual(questions);
  });

  it('matches both option indexes and values', () => {
    expect(isCorrectAnswer(questions[0], 'B')).toBe(true);
    expect(isCorrectAnswer(questions[1], 'yes')).toBe(true);
  });

  it('normalizes array and keyed-object options without losing answer keys', () => {
    expect(quizOptionEntries(questions[0])).toEqual([['0', 'A'], ['1', 'B']]);
    expect(quizOptionEntries({question: 'Keyed?', options: {A: 'Alpha', B: 'Beta'}, answer: 'B'}))
      .toEqual([['A', 'Alpha'], ['B', 'Beta']]);
    expect(isCorrectAnswer({question: 'Keyed?', options: {A: 'Alpha', B: 'Beta'}, answer: 'B'}, 'B')).toBe(true);
  });

  it('scores answers proportionally', () => {
    expect(scoreQuiz(questions, {'0': 'B', '1': 'no'}, 20)).toBe(10);
    expect(scoreQuiz(questions, {'0': 'B'}, 20)).toBe(10);
    expect(scoreQuiz(questions, {}, 20)).toBe(0);
  });
});
