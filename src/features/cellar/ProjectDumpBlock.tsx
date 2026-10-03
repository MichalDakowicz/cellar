import { View } from 'react-native';

import { kindChips } from '@/components/cellar/kindChips';
import { ProjectDumpField } from '@/components/cellar/ProjectDumpField';
import { useProjectDump } from '@/features/cellar/useProjectDump';
import { useCellarSettings } from '@/hooks/useCellarSettings';

/**
 * The project page's dump field, wired.
 *
 * A component of its own rather than a hook call in the route, because every
 * keystroke is state: held in the route it would re-render the whole list for
 * each letter. Here it re-renders the field.
 */
export function ProjectDumpBlock({ projectId, projectName, gutter }: { projectId: string; projectName: string; gutter: string }) {
  const dump = useProjectDump(projectId, projectName);
  const { settings } = useCellarSettings();

  return (
    <View className={`pb-3 ${gutter}`}>
      <ProjectDumpField
        text={dump.text}
        onChangeText={dump.setText}
        placeholder={dump.placeholder}
        hint={dump.hint}
        kind={dump.kind}
        kindOptions={kindChips(dump.kind, settings.kindOrder)}
        onKind={dump.setKind}
        picture={dump.picture}
        dropLabel={dump.dropLabel}
        canDrop={dump.canDrop}
        onDrop={dump.submit}
        onReturn={dump.onReturn}
      />
    </View>
  );
}
