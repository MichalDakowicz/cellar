import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { LinkedText } from '@/components/cellar/LinkedText';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown';

/**
 * An agent's reply, drawn — headings, lists, quotes, tables and fenced code,
 * with `code`, **bold**, *italic* and links inline (`lib/markdown`).
 *
 * Plain runs go through `LinkedText`, so bare links and colour codes inside a
 * reply stay live the same way they are on an entry. Code keeps its line
 * breaks and scrolls sideways rather than wrapping, because a wrapped command
 * is a different command.
 */
export function Markdown({ text, className = 'text-sm leading-relaxed text-foreground' }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  return (
    <View className="gap-2.5">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} className={className} />
      ))}
    </View>
  );
}

const HEADING_SIZE = ['text-lg', 'text-base', 'text-sm', 'text-sm', 'text-sm', 'text-sm'];

function BlockView({ block, className }: { block: Block; className: string }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text className={`${HEADING_SIZE[block.level - 1]} font-bold text-foreground`}>
          <Runs inline={block.inline} />
        </Text>
      );
    case 'list':
      return (
        <View className="gap-1">
          {block.items.map((item, index) => (
            <View key={index} className="flex-row gap-2 pl-1">
              <Text className={`${className} w-4 text-muted-foreground`}>{block.ordered ? `${index + 1}.` : '•'}</Text>
              <Text className={`${className} min-w-0 flex-1`}>
                <Runs inline={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case 'quote':
      return (
        <View className="border-l-2 border-border pl-3">
          <Text className={`${className} text-muted-foreground`}>
            <Runs inline={block.inline} />
          </Text>
        </View>
      );
    case 'code':
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="rounded-lg bg-secondary">
          <Text className="px-3 py-2.5 font-mono text-xs leading-5 text-foreground" selectable>
            {block.text}
          </Text>
        </ScrollView>
      );
    case 'table':
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="rounded-lg border border-border">
            {[block.header, ...block.rows].map((row, rowIndex) => (
              <View key={rowIndex} className={`flex-row ${rowIndex > 0 ? 'border-t border-border' : 'bg-secondary/60'}`}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={cellIndex}
                    className={`w-40 px-2.5 py-2 text-xs text-foreground ${rowIndex === 0 ? 'font-semibold' : ''}`}
                  >
                    <Runs inline={cell} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    case 'rule':
      return <View className="h-px bg-border" />;
    default:
      return (
        <Text className={className}>
          <Runs inline={block.inline} />
        </Text>
      );
  }
}

/** Inline runs, nested inside the block's own `Text` so they wrap with it. */
function Runs({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((run, index) => {
        switch (run.type) {
          case 'code':
            return (
              <Text key={index} className="bg-secondary font-mono text-[13px] text-foreground">
                {`\u2009${run.text}\u2009`}
              </Text>
            );
          case 'bold':
            return (
              <Text key={index} className="font-bold">
                {run.text}
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} className="italic">
                {run.text}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                className="text-primary"
                accessibilityRole="link"
                onPress={() => void WebBrowser.openBrowserAsync(run.href)}
              >
                {run.text}
              </Text>
            );
          default:
            return <LinkedText key={index} text={run.text} />;
        }
      })}
    </>
  );
}
