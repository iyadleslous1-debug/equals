import { parseWith, surveyAnswersSchema, type SurveyAnswers } from '../lib/validation/schemas';

const valid: SurveyAnswers = {
  hobbies: ['music', 'travel'],
  vibe: 'cafes',
  rhythm: 4,
  sports: 'sometimes',
  cooking: 'love',
  travel: 'essential',
  family: 5,
  career: 3,
  kids: 'maybe',
  smoking: 'no',
};

describe('surveyAnswersSchema (MVP2 piece 1)', () => {
  it('accepts a complete valid answer set', () => {
    expect(parseWith(surveyAnswersSchema, valid).ok).toBe(true);
  });

  it('rejects missing questions', () => {
    const partial: Record<string, unknown> = { ...valid };
    delete partial.vibe;
    expect(parseWith(surveyAnswersSchema, partial).ok).toBe(false);
  });

  it('rejects unknown keys (strict shape for deterministic scoring)', () => {
    expect(parseWith(surveyAnswersSchema, { ...valid, q99: 'x' }).ok).toBe(false);
  });

  it('rejects out-of-range scales and over-picked hobbies', () => {
    expect(parseWith(surveyAnswersSchema, { ...valid, rhythm: 6 }).ok).toBe(false);
    expect(
      parseWith(surveyAnswersSchema, { ...valid, hobbies: ['music', 'travel', 'sports', 'art'] }).ok,
    ).toBe(false);
    expect(parseWith(surveyAnswersSchema, { ...valid, hobbies: [] }).ok).toBe(false);
  });

  it('rejects invalid enum values', () => {
    expect(parseWith(surveyAnswersSchema, { ...valid, kids: 'soon' }).ok).toBe(false);
  });
});
