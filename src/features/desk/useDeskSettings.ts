import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { deskBridge } from '@/features/desk/bridge';
import { defaultRecipe, recipeLine } from '@/lib/deskSettings';
import { SAMPLE_RECIPES, SAMPLE_RULES, SAMPLE_USAGE } from '@/lib/deskSample';
import { offeredAgents } from '@/lib/deskStart';
import { hostLine } from '@/lib/deskView';
import { KINDS } from '@/lib/kinds';
import { useDeskPair } from '@/store/deskPair';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskLink } from './useDeskLink';

/**
 * Settings › desk (`DeskUsage`, `DeskRecipes`, `DeskHosts`): the defaults a new
 * task starts with — real, on this device — and everything else the desk will
 * be told, drawn with what it waits on. Usage, recipes and rules show the
 * sample desk's when it is on, and say what they wait for when it is not.
 */
export function useDeskSettings() {
  const router = useRouter();
  const link = useDeskLink();
  const { say } = useToast();
  const prefs = useDeskPrefs();
  const pair = useDeskPair((state) => state.pair);
  const forget = useDeskPair((state) => state.forget);
  const [kind, setKind] = useState<string>(KINDS[0].value);

  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);
  const host = hostLine(link.via, link.checking);
  // A kind's recipe: the sample desk's, or what actually happens today — your defaults.
  const fallback = defaultRecipe(prefs.defaultAgent, prefs.defaultMode);
  const recipeFor = (id: string) => (prefs.sample ? (SAMPLE_RECIPES[id] ?? fallback) : fallback);

  return {
    defaults: {
      agents: offeredAgents(installed),
      agent: prefs.defaultAgent,
      onAgent: prefs.setDefaultAgent,
      mode: prefs.defaultMode,
      onMode: prefs.setDefaultMode,
    },
    devices: {
      here: deskBridge() !== null,
      paired: pair?.name ?? null,
      onPair: () => router.push('/desk' as Href),
      onForget: pair
        ? () => {
            forget();
            say('this phone forgot the pc');
          }
        : null,
      sample: prefs.sample,
      onSample: prefs.setSample,
    },
    usage: prefs.sample ? SAMPLE_USAGE : [],
    recipes: {
      kinds: KINDS.map((option) => ({
        id: option.value,
        label: option.label,
        line: recipeLine(recipeFor(option.value)),
      })),
      kind,
      onKind: setKind,
      recipe: recipeFor(kind),
      custom: prefs.sample,
      rules: prefs.sample ? SAMPLE_RULES : [],
    },
    host: { name: link.name, online: host.online, line: host.line },
    onNotify: () => router.push('/desk/notify' as Href),
  };
}
