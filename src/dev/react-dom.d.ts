/** Only the web QA entry uses react-dom directly. */
declare module 'react-dom' {
  export function flushSync<T>(callback: () => T): T;
}
