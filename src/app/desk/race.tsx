import { RaceBody } from '@/components/desk/later/RaceBody';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { SAMPLE_RACE } from '@/lib/deskSample';

/** Race (docs/desk/screens.md, `PhoneRace.dc.html`): two runs off one commit, compared. W19. */
export default function RaceScreen() {
  return (
    <LaterScreen
      name="race"
      overline={`${SAMPLE_RACE.project} · race · same prompt, two runs`}
      title={SAMPLE_RACE.title}
      sub=""
      plainOverline
      sampleOnly
      waitsOn="two agents off one commit, compared and one kept — comes with races on the pc"
    >
      <RaceBody race={SAMPLE_RACE} />
    </LaterScreen>
  );
}
