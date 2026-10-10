import { answerPicks, questionAnswer } from './questionAnswer';

describe('structured question answers', () => {
  const options = ['Alpha', 'Alpha beta', 'Gamma'];
  it('stores exact deduplicated picks separately from a note', () => {
    expect(questionAnswer({ picks: ['Alpha beta', 'Gamma', 'Gamma'], note: 'Keep Alpha out' }, options))
      .toEqual({ answer: 'Alpha beta and Gamma — Keep Alpha out', answer_picks: ['Alpha beta', 'Gamma'], answer_note: 'Keep Alpha out' });
    expect(answerPicks({ options, answer: 'Alpha beta — Keep Alpha out', answerPicks: ['Alpha beta'] })).toEqual(['Alpha beta']);
  });
  it('keeps free text from selecting choices mentioned in prose', () => {
    const written = questionAnswer({ picks: [], note: 'Neither Alpha nor Gamma' }, options);
    expect(written.answer_picks).toEqual([]);
    expect(answerPicks({ options, answer: written.answer, answerPicks: [] })).toEqual([]);
  });
  it('keeps legacy prose and rejects invalid or empty new answers', () => {
    expect(questionAnswer('Alpha', options).answer_picks).toBeNull();
    expect(() => questionAnswer({ picks: ['alpha'], note: '' }, options)).toThrow('exactly match');
    expect(() => questionAnswer({ picks: [], note: '' }, options)).toThrow('1–8000');
  });
});
