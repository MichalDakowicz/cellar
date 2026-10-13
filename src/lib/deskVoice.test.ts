import { insertVoice, voiceOption, voiceText } from './deskVoice';
test('spoken dollar commands become literal keys without execution', () => {
  expect(voiceText('run dollar deploy then dollar test')).toBe('run $deploy then $test');
  expect(voiceText('twenty dollars')).toBe('twenty dollars');
});
test('letters/ordinals select only exact offered choices', () => {
  const options = ['first answer', 'second answer'];
  for (const speech of ['B', 'b.', 'option B', 'the second one', 'second']) expect(voiceOption(speech, options)).toBe(options[1]);
  for (const speech of ['C', 'perhaps B', 'the second one would be good', 'allow']) expect(voiceOption(speech, options)).toBeNull();
});
test('dictation replaces selection and preserves surrounding words', () => {
  expect(insertVoice('run old now', 'dollar deploy', { start: 4, end: 7 })).toBe('run $deploy now');
  expect(insertVoice('hello', 'world')).toBe('hello world');
  expect(insertVoice('hello', ' ')).toBe('hello');
});
