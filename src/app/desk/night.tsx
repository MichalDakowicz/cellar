import { NightBody } from '@/components/desk/later/NightBody';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { nightLine } from '@/lib/deskLater';
import { SAMPLE_NIGHT } from '@/lib/deskSample';

/** The night shift's digest (docs/desk/screens.md, `PhoneNight.dc.html`). W19. */
export default function NightScreen() {
  return (
    <LaterScreen
      name="night shift"
      overline={`night shift · ${SAMPLE_NIGHT.host} · ${SAMPLE_NIGHT.window}`}
      title="while you slept"
      sub={`${nightLine(SAMPLE_NIGHT.runs)} · used ${SAMPLE_NIGHT.used} · nothing shipped`}
      sampleOnly
      waitsOn="tonight's queue run in a window, with a digest in the morning — comes with the night shift"
    >
      <NightBody night={SAMPLE_NIGHT} />
    </LaterScreen>
  );
}
