import { LaterDesk } from "./LaterDesk";
import { NoticeDock } from './NoticeDock';
import { Share } from "./Share";
import { Notifications } from "./Notifications";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useHost } from "./useHost";
import { useCellar } from "./useCellar";
import { useRoute, navigate } from "./useRoute";
import { useHostQuery } from "./useHostQuery";
import { calls } from "./client";
import { Sidebar } from "./Sidebar";
import { Home } from "./Home";
import { Chat } from "./Chat";
import { Capture } from "./Capture";
import { Projects } from "./Projects";
import { Inbox } from "./Inbox";
import { Stats } from "./Stats";
import { Search } from "./Search";
import { EntryDetail } from "./EntryDetail";
import { Commands } from "./Commands";
import { Previews } from "./Previews";
import { Phone } from "./Phone";
import { Settings } from "./Settings";
import { NewTask } from "./NewTask";
import { Arrange } from "./Arrange";
import { CellarPicturesContext } from "./cellarContext";
import { useProfile } from "./useProfile";
import { useAccountPreferences } from "./accountPreferences";
import { presentationRuns, subscribedRun } from "./deskPresentation";
import { SampleChat } from "./SampleChat";
import { sampleData } from "./sampleData";
import { SAMPLE_PROJECTS } from "@/lib/deskSample";
import { saved, useSaved } from "./preferences";

export function DesktopApp({
  ownerId,
  email,
  name,
}: {
  ownerId: string;
  email: string;
  name: string;
}) {
  const prefs = useAccountPreferences();
  const path = useRoute();
  const workspace = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    workspace.current?.scrollTo({ top: 0, left: 0 });
  }, [path]);
  const firstRoute = useRef(path === "/");
  useEffect(() => {
    if (prefs.loading || !firstRoute.current) return;
    firstRoute.current = false;
    if (location.pathname !== "/") return;
    const destination = {
      dump: "/",
      shelf: "/projects",
      inbox: "/inbox",
      stats: "/stats",
    }[prefs.settings.startTab];
    if (destination !== "/") navigate(destination);
  }, [prefs.loading, prefs.settings.startTab]);
  const runId = path.startsWith("/desk/run/") ? path.split("/").at(-1)! : null;
  useSaved();
  const samples = saved("cellar-desk-prefs", "sample", false);
  const host = useHost(ownerId, subscribedRun(runId));
  const presentedHost = {
    ...host,
    state: { ...host.state, runs: presentationRuns(host.state.runs, samples) },
  };
  const sampleHost = sampleData("working").host;
  const cellar = useCellar(ownerId);
  const profile = useProfile(ownerId, name);
  const commands = useHostQuery(
    host.live && host.can.commands,
    calls.commands,
    host.key,
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate("/search");
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("/");
      }
      if (event.altKey && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        navigate(
          ["/", "/projects", "/inbox", "/stats", "/desk"][
            Number(event.key) - 1
          ],
        );
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  let content;
  if (path === "/") content = <Capture cellar={cellar} />;
  else if (path === "/projects" || path.startsWith("/project/"))
    content = (
      <Projects
        cellar={cellar}
        host={host}
        id={path.startsWith("/project/") ? path.slice(9) : undefined}
      />
    );
  else if (path === "/inbox") content = <Inbox cellar={cellar} />;
  else if (path === "/stats") content = <Stats cellar={cellar} />;
  else if (path === "/search") content = <Search cellar={cellar} />;
  else if (path.startsWith("/arrange"))
    content = (
      <Arrange
        cellar={cellar}
        projectId={
          path.startsWith("/arrange/project/") ? path.slice(17) : undefined
        }
      />
    );
  else if (path.startsWith("/entry/"))
    content = <EntryDetail key={path} cellar={cellar} id={path.slice(7)} />;
  else if (path === "/desk/new")
    content = <NewTask cellar={cellar} host={host} />;
  else if (path === "/desk/share") content = <Share cellar={cellar} />;
  else if (path === "/desk/notify")
    content = <Notifications cellar={cellar} host={host} />;
  else if (runId?.startsWith("sample-") && samples)
    content = (
      <SampleChat
        key={runId}
        cellar={cellar}
        host={sampleHost}
        page={runId === "sample-1" ? "approval" : "chat"}
        phase="working"
        runId={runId}
      />
    );
  else if (path === "/desk/chat" || runId)
    content = (
      <Chat key={runId} cellar={cellar} host={presentedHost} runId={runId} />
    );
  else if (path === "/desk/commands")
    content = (
      <Commands
        projects={
          samples
            ? [...(commands.data ?? []), ...SAMPLE_PROJECTS]
            : commands.data
        }
      />
    );
  else if (path === "/desk/previews" || path.startsWith("/desk/preview/"))
    content = (
      <Previews
        host={host}
        port={path.startsWith("/desk/preview/") ? path.slice(14) : undefined}
      />
    );
  else if (["/desk/race", "/desk/night", "/desk/group"].includes(path))
    content = <LaterDesk cellar={cellar} page={path.slice(6) as "race" | "night" | "group"} />;
  else if (path === "/desk/phone") content = <Phone />;
  else if (path.startsWith("/settings"))
    content = (
      <Settings
        host={host}
        cellar={cellar}
        email={email}
        section={path.slice(10)}
      />
    );
  else
    content = (
      <Home
        host={presentedHost}
        cellar={cellar}
        commands={
          samples
            ? [...(commands.data ?? []), ...SAMPLE_PROJECTS]
            : commands.data
        }
      />
    );
  return (
    <CellarPicturesContext.Provider value={cellar.pictures}>
      <div className="desktop-shell">
        <Sidebar
          path={path}
          cellar={cellar}
          host={host}
          name={profile.name}
          avatar={profile.avatar}
        />
        <main ref={workspace} className="workspace" aria-label="Cellar desktop">
          <NoticeDock host={host} />
          {prefs.error && (
            <div className="data-error" role="status">
              Settings failed · {prefs.error}
            </div>
          )}
          {cellar.error && (
            <div className="data-error" role="status">
              Cellar read failed · {cellar.error}
              <button onClick={() => void cellar.refresh()}>retry</button>
            </div>
          )}
          {content}
        </main>
      </div>
    </CellarPicturesContext.Provider>
  );
}
