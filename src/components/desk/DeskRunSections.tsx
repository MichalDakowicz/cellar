import { Text, View } from 'react-native';

import { DeskRunCardRow } from '@/components/desk/DeskRunCardRow';
import { Overline } from '@/components/ui/controls';
import type { DeskRunCard, DeskRunSections as Sections } from '@/lib/deskView';

const TITLES: [keyof Sections<DeskRunCard>, string][] = [
  ['waiting', 'waiting on you'],
  ['running', 'running'],
  ['lately', 'lately'],
];

/**
 * The desk's runs as waiting → running → lately, each under its overline and
 * only when it has something in it. With nothing at all, one quiet line.
 */
export function DeskRunSections({
  sections,
  gutter,
  empty,
  onOpen,
  onStop,
}: {
  sections: Sections<DeskRunCard>;
  gutter: string;
  /** Said when there are no runs anywhere — "reading…", an error, "nothing running". */
  empty: string;
  onOpen: ((id: string) => void) | null;
  onStop: ((id: string) => void) | null;
}) {
  const shown = TITLES.filter(([key]) => sections[key].length > 0);

  if (shown.length === 0) {
    return (
      <View className={`gap-1 pt-7 ${gutter}`}>
        <Overline>runs</Overline>
        <Text className="pt-1 text-xs text-muted-foreground">{empty}</Text>
      </View>
    );
  }

  return (
    <>
      {shown.map(([key, title]) => (
        <View key={key} className={`gap-1.5 pt-6 ${gutter}`}>
          <Overline>{title}</Overline>
          {sections[key].map((run) => (
            <DeskRunCardRow key={run.id} run={run} onOpen={onOpen} onStop={onStop} />
          ))}
        </View>
      ))}
    </>
  );
}
