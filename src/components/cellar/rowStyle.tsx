import { createContext, useContext } from 'react';

import { rowMetrics } from '@/lib/displayPrefs';

export type RowStyle = ReturnType<typeof rowMetrics>;

/**
 * How tall an entry row sits and how big its thought reads — the density and
 * text size settings, resolved once (`lib/displayPrefs.rowMetrics`).
 *
 * A context rather than a prop, because every row in the app is `EntryCard`
 * and threading two numbers through every list that renders one would touch
 * a dozen screens to change none of them. The default is today's row, so a
 * card rendered outside the provider looks exactly as it always did.
 */
const RowStyleContext = createContext<RowStyle>(rowMetrics('roomy', 'normal'));

export const RowStyleProvider = RowStyleContext.Provider;

export function useRowStyle(): RowStyle {
  return useContext(RowStyleContext);
}
