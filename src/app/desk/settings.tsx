import { Redirect, type Href } from 'expo-router';

/** Desk settings moved into settings, one section each; old links land on agents. */
export default function DeskSettingsMoved() {
  return <Redirect href={'/settings/agents' as Href} />;
}
