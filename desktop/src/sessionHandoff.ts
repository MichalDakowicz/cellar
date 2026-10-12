/** Serialize access-token handoffs so an older owner cannot arrive after a newer one. */
export function sessionHandoff<T>(
  send: (value: T) => Promise<unknown>,
  publish: (value: T, error: unknown | null) => void,
) {
  let revision = 0;
  let active = true;
  let tail = Promise.resolve();
  return {
    get revision() {
      return revision;
    },
    accept(value: T) {
      const version = ++revision;
      tail = tail.then(async () => {
        if (!active || version !== revision) return;
        let error: unknown | null = null;
        try {
          await send(value);
        } catch (failure) {
          error = failure;
        }
        if (active && version === revision) publish(value, error);
      });
      return tail;
    },
    dispose() {
      active = false;
      revision++;
    },
  };
}
