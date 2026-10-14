import { RULE_START, RULE_END } from './deskRecipes';

/** Hide managed-block comments in rendered prose, preserving literal code examples. */
export function renderedRules(source: string) {
  let fenced = false;
  return source.split(/\r?\n/).filter((line) => {
    if (/^\s*```/.test(line)) fenced = !fenced;
    return fenced || (line !== RULE_START && line !== RULE_END);
  }).join('\n');
}

/** One changed span with context, avoiding two full copies of unchanged instructions. */
export function instructionDiff(name: string, before: string, after: string) {
  if (before === after) return `No changes to ${name}.`;
  const lines = (value: string) => value ? value.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n') : [];
  const old = lines(before); const next = lines(after);
  let prefix = 0; let suffix = 0;
  while (prefix < old.length && prefix < next.length && old[prefix] === next[prefix]) prefix++;
  while (suffix < old.length - prefix && suffix < next.length - prefix && old[old.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  const start = Math.max(0, prefix - 3);
  const oldEnd = Math.min(old.length, old.length - suffix + 3);
  const newEnd = Math.min(next.length, next.length - suffix + 3);
  const context = old.slice(start, prefix).map((l) => '  ' + l);
  const removed = old.slice(prefix, old.length - suffix).map((l) => '- ' + l);
  const added = next.slice(prefix, next.length - suffix).map((l) => '+ ' + l);
  const tail = old.slice(old.length - suffix, oldEnd).map((l) => '  ' + l);
  return [`--- ${name}`, `+++ ${name}`, `@@ -${start + 1},${oldEnd - start} +${start + 1},${newEnd - start} @@`, ...context, ...removed, ...added, ...tail].join('\n');
}
