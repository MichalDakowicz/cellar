/** Standalone Metro entry for visual QA. No auth, database or host clients mount here. */
import '@/global.css';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import { ChevronLeft, Monitor, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AttachedThought } from '@/components/desk/AttachedThought';
import { ApprovalPanel } from '@/components/desk/ApprovalPanel';
import { DeskCaptureBar } from '@/components/desk/DeskCaptureBar';
import { DeskCommandTiles } from '@/components/desk/DeskCommandTiles';
import { DeskHostCard } from '@/components/desk/DeskHostCard';
import { DeskHostsBlock } from '@/components/desk/DeskHostsBlock';
import { DeskIdentity } from '@/components/desk/DeskIdentity';
import { DeskKeysBlock } from '@/components/desk/DeskKeysBlock';
import { DeskRecipesBlock } from '@/components/desk/DeskRecipesBlock';
import { DeskRunScope } from '@/components/desk/DeskRunScope';
import { DeskRunSections } from '@/components/desk/DeskRunSections';
import { DeskSheet } from '@/components/desk/DeskSheet';
import { DeskUsageBlock } from '@/components/desk/DeskUsageBlock';
import { DeskWaitingCards } from '@/components/desk/DeskWaitingCards';
import { NewTaskChoices } from '@/components/desk/NewTaskChoices';
import { NewTaskVoice } from '@/components/desk/NewTaskVoice';
import { NotePreview } from '@/components/desk/NotePreview';
import { PreviewChecks } from '@/components/desk/PreviewChecks';
import { PreviewDeployBar } from '@/components/desk/PreviewDeployBar';
import { PreviewFrame } from '@/components/desk/PreviewFrame';
import { PreviewSizeBar } from '@/components/desk/PreviewSizeBar';
import { RunComposer } from '@/components/desk/RunComposer';
import { RunHeader } from '@/components/desk/RunHeader';
import { RunChatItems } from '@/components/desk/RunChatItems';
import { RunRail } from '@/components/desk/RunRail';
import { GroupBody } from '@/components/desk/later/GroupBody';
import { NightBody } from '@/components/desk/later/NightBody';
import { PhoneBody } from '@/components/desk/later/PhoneBody';
import { RaceBody } from '@/components/desk/later/RaceBody';
import { ShareBody } from '@/components/desk/later/ShareBody';
import { QuestionCard } from '@/components/cellar/QuestionCard';
import { NavDestinationButton } from '@/components/layout/NavDestinationButton';
import { NAV_DESTINATIONS } from '@/components/layout/navDestinations';
import { Glass } from '@/components/desk/ScreenIslands';
import { SAMPLE_COMPOSER_MODELS, SAMPLE_COMPOSER_QUEUE } from '@/lib/deskCanvas';
import { chatItems } from '@/lib/deskChat';
import { approvalNote, questionNote, runNote } from '@/lib/deskNotify';
import { defaultRecipe } from '@/lib/deskSettings';
import { deskSections } from '@/lib/deskView';
import { SAMPLE_CHATS, SAMPLE_FIGURES, SAMPLE_GROUP, SAMPLE_NIGHT, SAMPLE_PHONE, SAMPLE_PREVIEW, SAMPLE_PROJECTS, SAMPLE_QUESTION, SAMPLE_RACE, SAMPLE_RAIL, SAMPLE_RULES, SAMPLE_RUNS, SAMPLE_USAGE } from '@/lib/deskSample';
import { COLORS, rawThemeVars, themeVars } from '@/theme/colors';

const noop = () => {};
const keys = { list: null, plan: [], onKey: noop, onSelection: noop, onCopy: noop, onNudge: noop };
const sections = deskSections(SAMPLE_RUNS);
const host = { name: 'michu-pc', online: true, line: 'on this network · sample desk', figures: SAMPLE_FIGURES, onScreen: noop };
const params = new URLSearchParams(location.search);
const board = params.get('page') ?? 'main';
const wide = ['home', 'chat', 'phone', 'group', 'recipes', 'hosts', 'usage', 'keys'].includes(board);
const width = Number(params.get('width') ?? (wide ? 1440 : 390));
const theme = params.get('theme') === 'light' ? 'light' : 'dark';
Object.entries(rawThemeVars[theme]).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));

function Islands() {
  return <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
    <Glass style={{ height: 52, width: 52, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}>{board === 'main' ? <Plus size={21} color={COLORS.foreground} /> : <ChevronLeft size={21} color={COLORS.foreground} />}</Glass>
    <Glass style={{ height: 52, borderRadius: 99, padding: 4, flexDirection: 'row' }}>{NAV_DESTINATIONS.slice(0, 4).map((destination) => <NavDestinationButton key={destination.tabName} destination={destination} active={false} onPress={noop} />)}</Glass>
    <Glass style={{ height: 52, width: 52, borderRadius: 99, alignItems: 'center', justifyContent: 'center' }}><Monitor size={20} color={COLORS.foreground} /></Glass>
  </View>;
}

function Preview() {
  const [loaded, fontError] = useFonts({ SplineSans: require('../../assets/fonts/SplineSans.ttf'), IBMPlexMono: require('../../assets/fonts/IBMPlexMono-Regular.ttf') });
  const [draft, setDraft] = useState('');
  const [scope, setScope] = useState<'all' | 'project'>('all');
  const [project, setProject] = useState('sample-app');
  const [size, setSize] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [agent, setAgent] = useState<'claude' | 'codex' | 'agy'>('codex');
  const [mode, setMode] = useState<'ask' | 'edits' | 'full'>('edits');
  const current = SAMPLE_PROJECTS.find((row) => row.id === project) ?? SAMPLE_PROJECTS[0];
  const chat = SAMPLE_CHATS['sample-1'];
  if (fontError) return <Text style={{ color: 'white' }}>{fontError.message}</Text>;
  if (!loaded) return <Text style={{ color: 'white' }}>loading canvas fonts…</Text>;
  const footer = <View className="h-[52px] items-center justify-center rounded-lg bg-foreground"><Text className="font-sans text-base font-semibold text-background">↑ send to michu-pc</Text></View>;
  let content;
  if (board === 'new') content = <DeskSheet onClose={noop} header={<View className="flex-row items-center"><View className="flex-1"><Text className="font-sans text-lg font-bold text-foreground">new task</Text><Text className="font-sans text-xs text-muted-foreground">● to michu-pc · sample desk</Text></View><Text className="font-sans text-2xl text-foreground">×</Text></View>} footer={footer}><NewTaskVoice text={draft} onText={setDraft} keys={keys} /><NewTaskChoices projects={SAMPLE_PROJECTS} projectId={project} onProject={setProject} where="main" onWhere={noop} folder="~/code/cellar" agents={['claude', 'codex']} agent={agent} onAgent={setAgent} mode={mode} onMode={setMode} modeHint="File edits go ahead; commands and installs ask for approval." /><AttachedThought thoughts={[]} onDetach={noop} /></DeskSheet>;
  else if (['run', 'approval', 'queue', 'chat'].includes(board)) content = <View className="flex-1"><View className="border-b border-border/50 px-4 pb-3 pt-4"><RunHeader title="add the desk tab" meta="cellar · codex" branch={chat.branch} state={board === 'approval' ? 'waiting' : 'running'} age="9m" diff={chat.diff} onStop={noop} connection="michu-pc · sample desk" /></View><ScrollView className="flex-1" contentContainerClassName="p-4"><RunChatItems items={chatItems(chat.lines)} youCaption="you · from your phone · 14:02" /></ScrollView><View className="border-t border-border/50 px-4 pt-2.5" style={{ paddingBottom: wide ? 16 : 92 }}>{board === 'approval' ? <ApprovalPanel approval={chat.approval!} onDecide={noop} /> : <RunComposer draft={draft} onDraft={setDraft} dispatch="queue" onDispatch={noop} disabledReason="Sample desk · message delivery comes in the wiring pass" keys={keys} sampleModels={SAMPLE_COMPOSER_MODELS} sampleQueue={board === 'queue' ? SAMPLE_COMPOSER_QUEUE : []} />}</View></View>;
  else if (board === 'share') content = <DeskSheet onClose={noop} height="76%" footer={footer}><ShareBody text={draft} onText={setDraft} kind="glitch" guessed onKind={noop} projects={SAMPLE_PROJECTS} projectId={project} onProject={noop} handoff={false} onHandoff={noop} onCancel={noop} /></DeskSheet>;
  else content = <ScrollView contentContainerClassName={`gap-5 pb-28 pt-4 ${wide ? 'px-8' : 'px-4'}`}>
    {board === 'main' && <><DeskIdentity {...host} checking={false} summary="1 working · 2 waiting on you" sample onSettings={noop} /><DeskWaitingCards runs={sections.waiting} thoughts={[{ id: 'q', title: 'keep the total visible?', detail: 'Should the total stay pinned while the list scrolls?' }]} onRun={noop} onThought={noop} /><DeskHostCard {...host} compact /><DeskCommandTiles projects={SAMPLE_PROJECTS} current={current} onPick={setProject} onRun={noop} gutter="" /><DeskRunScope project={current.name} scope={scope} onScope={setScope} /><DeskRunSections sections={sections} only={['running', 'lately']} gutter="" onOpen={noop} empty="nothing running" /></>}
    {board === 'home' && <><Text className="font-sans text-2xl font-bold text-foreground">desk</Text><DeskCaptureBar text={draft} onText={setDraft} busy={false} onFile={noop} onHandoff={noop} /><View className="flex-row gap-8"><View className="flex-[3]"><DeskWaitingCards runs={sections.waiting} thoughts={[]} onRun={noop} onThought={noop} /><DeskRunSections sections={sections} gutter="" onOpen={noop} empty="" only={['running', 'lately']} /></View><View className="flex-[2] gap-7"><DeskHostCard {...host} /><DeskCommandTiles projects={SAMPLE_PROJECTS} current={current} onPick={setProject} onRun={noop} gutter="" mono /></View></View></>}
    {board === 'preview' && <><Text className="font-sans text-xl font-bold text-foreground">try it before it ships</Text><PreviewSizeBar size={size} onSize={setSize} onReload={noop} /><PreviewFrame address="michu-pc · tailnet :8081/inbox" load="live" size={size} url={null} unreachable={null} sample page={{ reloads: 0, onLoadStart: noop, onLoad: noop, onError: noop, onUrl: noop }} /><PreviewChecks host="michu-pc" checks={SAMPLE_PREVIEW.checks} empty="" /><PreviewDeployBar deploy={{ kind: 'ready', target: 'to firebase hosting · sample-site' }} onDeploy={noop} onTellAgent={noop} /></>}
    {board === 'race' && <><Text className="font-sans text-xs text-muted-foreground">cellar · race · 2 runs off the same commit</Text><Text className="font-sans text-xl font-bold text-foreground">{SAMPLE_RACE.title}</Text><RaceBody race={SAMPLE_RACE} /></>}
    {board === 'night' && <><Text className="font-sans text-xs text-muted-foreground">NIGHT SHIFT · {SAMPLE_NIGHT.host}</Text><Text className="font-sans text-2xl font-bold text-foreground">while you slept</Text><NightBody night={SAMPLE_NIGHT} onAdd={noop} /></>}
    {board === 'phone' && <><Text className="font-sans text-2xl font-bold text-foreground">pixel</Text><PhoneBody phone={SAMPLE_PHONE} /></>}
    {board === 'group' && <><Text className="font-sans text-2xl font-bold text-foreground">{SAMPLE_GROUP.title}</Text><GroupBody group={SAMPLE_GROUP} /></>}
    {board === 'hosts' && <><Text className="font-sans text-2xl font-bold text-foreground">hosts</Text><DeskHostsBlock name="michu-pc" online line="connected" /></>}
    {board === 'keys' && <DeskKeysBlock />}
    {board === 'usage' && <><Text className="font-sans text-2xl font-bold text-foreground">usage and accounts</Text><DeskUsageBlock agents={SAMPLE_USAGE} /></>}
    {board === 'recipes' && <DeskRecipesBlock kinds={[{ id: 'glitch', label: 'glitch', line: 'reproduce → fix → check' }]} kind="glitch" onKind={noop} recipe={defaultRecipe('claude', 'edits')} custom={false} rules={SAMPLE_RULES} />}
    {board === 'notify' && <>{[runNote({ id: 'sample-run', title: 'fix inbox swipe', host: 'michu-pc', doing: 'editing SwipeShelf.tsx', plan: { at: 3, of: 5 }, stoppable: true }), approvalNote({ id: 'sample-approval', agent: 'codex', what: 'run a command', subject: 'npm install zustand', where: 'cellar · add desk tab' }), questionNote(SAMPLE_QUESTION)].map((note, index) => <NotePreview key={index} note={note} done={null} onAction={noop} />)}</>}
    {board === 'question' && <QuestionCard question="How should the cart open on phones?" options={SAMPLE_QUESTION.options} answer={null} answeredVia={null} status="unanswered" agent="claude" rel="4m" draft={draft} picked={[SAMPLE_QUESTION.options[0]]} several={false} note={null} onDraft={setDraft} onToggle={noop} onSeveral={noop} onOpenNote={noop} onNote={noop} onAnswer={noop} onSubmit={noop} onLetDecide={noop} onDismiss={noop} />}
  </ScrollView>;
  return <SafeAreaProvider><View style={[themeVars[theme], { width, height: 844, alignSelf: 'center' }]} className="bg-background"><View className="min-h-0 flex-1 flex-row">{wide && <View className="w-[232px] gap-5 border-r border-border/50 bg-row px-3 py-5"><Text className="font-sans px-2 text-lg font-bold text-foreground">cellar</Text>{['CELLAR', 'dump', 'projects', 'inbox', 'stats', 'DESK', 'home', 'chat', 'commands', 'previews', 'pixel', 'PINNED', 'cellar', 'solar', 'radar'].map((label, i) => <Text key={i} className="font-sans px-3 text-sm text-muted-foreground">{label}</Text>)}</View>}<View className="min-w-0 flex-1">{content}</View>{board === 'chat' && <RunRail {...SAMPLE_RAIL['sample-1']} onPreview={noop} empty={null} />}</View>{!wide && !['new', 'share'].includes(board) && <Islands />}</View></SafeAreaProvider>;
}

// The isolated QA tab can be backgrounded; commit its initial frame immediately.
flushSync(() => registerRootComponent(Preview));
