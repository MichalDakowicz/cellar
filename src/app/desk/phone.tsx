import { PhoneBody } from '@/components/desk/later/PhoneBody';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { SAMPLE_PHONE } from '@/lib/deskSample';

/** The phone on the pc over adb (docs/desk/screens.md, `DeskPhone.dc.html`). W18. */
export default function PhoneScreen() {
  return (
    <LaterScreen
      name="phone over adb"
      overline="phone over adb"
      title={SAMPLE_PHONE.name}
      sub={SAMPLE_PHONE.line}
      sampleOnly
      waitsOn="a phone on the pc's usb, mirrored and driven — comes once the pc talks adb"
      wide
      bigTitle
    >
      <PhoneBody phone={SAMPLE_PHONE} />
    </LaterScreen>
  );
}
