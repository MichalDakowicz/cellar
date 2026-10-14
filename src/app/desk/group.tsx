import { GroupBody } from '@/components/desk/later/GroupBody';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { SAMPLE_GROUP } from '@/lib/deskSample';
import { useDeskPrefs } from '@/store/deskPrefs';
import { LiveRunPlans } from '@/features/desk/LiveRunPlans';

/** A group run (docs/desk/screens.md, `DeskGroupRun.dc.html`): one task across a shelf. W19. */
export default function GroupRunScreen() {
  const sample = useDeskPrefs((s) => s.sample);
  if (!sample) return <LiveRunPlans kind="group" />;
  return (
    <LaterScreen
      name="group run"
      overline={`group run · ${SAMPLE_GROUP.group} · ${SAMPLE_GROUP.projects.length} projects`}
      title={SAMPLE_GROUP.title}
      sub={SAMPLE_GROUP.meta}
      sampleOnly
      waitsOn="one prompt across every project in a group — comes with group runs on the pc"
      wide
      bigTitle
    >
      <GroupBody group={SAMPLE_GROUP} />
    </LaterScreen>
  );
}
