import * as WebBrowser from 'expo-web-browser';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useLinkPreview } from '@/hooks/useLinkPreview';
import { linkHost, splitLinks } from '@/lib/links';

/**
 * A thought, or a line under one, with its links live.
 *
 * The one renderer. A thought, your own line and an agent's line are three
 * components and they each drew a bare `Text` before this — three places to
 * teach about links is three places that drift, so all three now hand their
 * string here (`lib/links` does the cutting).
 *
 * A link reads as **what the page is called**, not as its url. That is the
 * whole point: a cellar is a wall of one-line thoughts and forty characters of
 * `?utm_source=` in the middle of one destroys the line it is in. Until the
 * title is known — and on the web build, where it never is — it reads as the
 * host, which is short enough to live in a sentence and still says where it
 * goes.
 *
 * It is a nested `Text`, not a `Pressable`, so the link wraps with the sentence
 * instead of becoming a block that breaks the line it sits in.
 */
export function LinkedText({
  text,
  className,
  style,
  numberOfLines,
}: {
  text: string;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const segments = splitLinks(text);

  return (
    <Text className={className} style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          segment.value
        ) : (
          <LinkSpan key={`${segment.href}:${index}`} href={segment.href} />
        ),
      )}
    </Text>
  );
}

/**
 * One link inside the sentence.
 *
 * Its own component because it subscribes to that link's record — a row with
 * three links would otherwise re-render on any of the three resolving, and in a
 * virtualized list that is every visible row re-rendering on every fetch.
 */
function LinkSpan({ href }: { href: string }) {
  const record = useLinkPreview(href);
  const label = record?.meta.title ?? linkHost(href);

  return (
    <Text
      className="text-primary"
      accessibilityRole="link"
      accessibilityLabel={`open ${label}`}
      // Stops the row's own press from firing too: on a row whose whole line
      // opens the entry, a tap on the link has to mean the link.
      onPress={(event) => {
        event.stopPropagation();
        void WebBrowser.openBrowserAsync(href);
      }}
    >
      {label}
    </Text>
  );
}
