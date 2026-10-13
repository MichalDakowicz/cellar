import { createRoot } from "react-dom/client";
import { DesktopApp } from "./DesktopApp";
import { useAuth } from "./useAuth";
import { Login } from "./Login";
import { bridge } from "./client";
import { SampleRenderer } from "./SampleRenderer";
import { PreferencesProvider } from "./PreferencesProvider";
import { applyTheme, cachedTheme } from "./theme";
import "./styles.css";
import "./views.css";
import { VISUAL_PREVIEW } from "./appMode";
import { RecoveryBoundary } from "./RecoveryBoundary";

function Root() {
  const auth = useAuth();
  if (auth.loading) return <main className="empty">opening cellar…</main>;
  if (auth.error)
    return (
      <main className="empty" role="alert">
        {auth.error}
      </main>
    );
  if (!auth.session) return <Login />;
  return (
    <PreferencesProvider
      key={auth.session.user.id}
      ownerId={auth.session.user.id}
    >
      <DesktopApp
        ownerId={auth.session.user.id}
        email={auth.session.user.email ?? "you"}
        name={
          auth.session.user.user_metadata?.display_name ??
          auth.session.user.email?.split("@")[0] ??
          "you"
        }
      />
    </PreferencesProvider>
  );
}
applyTheme(cachedTheme());
createRoot(document.getElementById("root")!).render(
  <RecoveryBoundary>
    {VISUAL_PREVIEW ? (
      <SampleRenderer />
    ) : bridge ? (
      <Root />
    ) : (
      <main className="empty">
        Open in Cellar desktop. Browser has no local host bridge.
      </main>
    )}
  </RecoveryBoundary>,
);
