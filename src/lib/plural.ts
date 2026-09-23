/**
 * "4 entries" / "1 entry". Pluralisation everywhere, in one place.
 *
 * Its own file rather than a line in `utils.ts`, because `utils.ts` pulls clsx
 * and tailwind-merge in with `cn`, and the MCP edge function bundles every
 * `@/lib` module it reaches. `containers.ts` needs this and nothing else from
 * there, so a two-line helper was dragging a styling library into a server.
 */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
