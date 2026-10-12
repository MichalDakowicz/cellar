import { useEffect } from "react";
import { SAMPLE_PROJECTS } from "@/lib/deskSample";
import { Sidebar } from "./Sidebar";
import { Home } from "./Home";
import { Phone } from "./Phone";
import { Settings } from "./Settings";
import { Capture } from "./Capture";
import { Projects } from "./Projects";
import { Inbox } from "./Inbox";
import { Stats } from "./Stats";
import { NewTask } from "./NewTask";
import { LaterDesk } from "./LaterDesk";
import { SampleChat } from "./SampleChat";
import { sampleData } from "./sampleData";
import { applyTheme } from "./theme";
import { save } from "./preferences";
export function SampleRenderer() {
  const params = new URLSearchParams(location.search);
  const page = params.get("page") ?? "home";
  const phase = params.get("state") ?? "working";
  const theme = params.get("theme") === "light" ? "light" : "dark";
  const { cellar, host } = sampleData(
    phase,
    ["capture", "projects", "project", "inbox", "stats", "account"].includes(
      page,
    ),
  );
  useEffect(() => {
    applyTheme(theme);
    save("cellar-desk-prefs", "sample", true);
  }, [theme]);
  let content;
  if (page === "home")
    content = <Home cellar={cellar} host={host} commands={SAMPLE_PROJECTS} />;
  else if (page === "phone") content = <Phone />;
  else if (page === "capture") content = <Capture cellar={cellar} />;
  else if (page === "projects" || page === "project")
    content = (
      <Projects
        cellar={cellar}
        host={host}
        id={page === "project" ? "sample-app" : undefined}
      />
    );
  else if (page === "inbox") content = <Inbox cellar={cellar} />;
  else if (page === "stats") content = <Stats cellar={cellar} />;
  else if (page === "new") content = <NewTask cellar={cellar} host={host} />;
  else if (["race", "night", "group"].includes(page))
    content = <LaterDesk page={page as "race" | "night" | "group"} />;
  else if (
    [
      "usage",
      "recipes",
      "hosts",
      "keys",
      "devices",
      "account",
      "agents",
      "notifications",
      "dump",
    ].includes(page)
  )
    content = (
      <Settings section={page} cellar={cellar} host={host} email="sample" />
    );
  else
    content = (
      <SampleChat cellar={cellar} host={host} page={page} phase={phase} />
    );
  return (
    <div className="desktop-shell">
      <Sidebar
        path={
          page === "home"
            ? "/desk"
            : ["capture", "projects", "project", "inbox", "stats"].includes(
                  page,
                )
              ? {
                  capture: "/",
                  projects: "/projects",
                  project: "/projects",
                  inbox: "/inbox",
                  stats: "/stats",
                }[page]!
              : page === "phone"
                ? "/desk/phone"
                : "/desk/chat"
        }
        cellar={cellar}
        host={host}
        name="michu"
      />
      <main className="workspace">
        <div className="sample-banner">
          sample desk · isolated visual preview · no host operations
        </div>
        {content}
      </main>
    </div>
  );
}
