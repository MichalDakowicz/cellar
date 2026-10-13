import { Text } from 'react-native';

import type { TextPart } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

/** A line cut by `detailParts`/`metaParts`: mono where it is a command or path, coloured where it is a diff. */
export function TextParts({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <Text
          key={`${index}:${part.text}`}
          className={part.mono ? 'font-mono' : undefined}
          style={part.tone ? { color: part.tone === 'added' ? COLORS.ok : COLORS.danger } : undefined}
        >
          {part.text}
        </Text>
      ))}
    </>
  );
}
