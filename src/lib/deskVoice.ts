/** Spoken commands remain text for the normal keys parser; no command executes here. */
export function voiceText(transcript: string): string {
  return transcript.trim().replace(/\bdollar\s+([a-z][a-z0-9:_-]*)/gi, (_, name: string) => `$${name.toLowerCase()}`);
}
export function voiceOption(transcript: string, options: readonly string[]): string | null {
  const spoken = transcript.trim().toLowerCase().replace(/[.!?,]+$/g, '');
  const letter = /^(?:(?:option|choose|pick)\s+)?([a-z])$/.exec(spoken);
  const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  const ordinal = /^(?:the\s+)?(\w+)(?:\s+(?:one|option))?$/.exec(spoken);
  const index = letter ? letter[1].charCodeAt(0) - 97 : ordinal ? ordinals.indexOf(ordinal[1]) : -1;
  return index >= 0 && index < options.length ? options[index] : null;
}
export function insertVoice(text: string, transcript: string, selection = { start: text.length, end: text.length }): string {
  const value = voiceText(transcript); if (!value) return text;
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const before = text.slice(0, start), after = text.slice(end);
  return `${before}${before && !/\s$/.test(before) ? ' ' : ''}${value}${after && !/^\s/.test(after) ? ' ' : ''}${after}`;
}
