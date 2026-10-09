import { ShareBody } from '@/components/desk/later/ShareBody';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { useDeskShare } from '@/features/desk/useDeskShare';

/** File it into cellar (docs/desk/screens.md, `PhoneShare.dc.html`). Filing is real; the share target is W17. */
export default function ShareScreen() {
  const share = useDeskShare();
  return (
    <LaterScreen
      name="share into cellar"
      overline="share into cellar"
      title="file it into cellar"
      sub="what other apps will hand to cellar from their share sheet — for now, type it here"
      sampleOnly={false}
      waitsOn=""
    >
      <ShareBody {...share} />
    </LaterScreen>
  );
}
