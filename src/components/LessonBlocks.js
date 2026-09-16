import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radius, spacing, type } from '../theme/colors';

/**
 * Lesson content is stored as an array of blocks. This renders them.
 *
 * Block types: text, code, heading, list, note, table, image, video.
 * Text values may contain **bold** and `inline code`, which InlineText turns
 * into nested <Text> runs. Doing it here avoids pulling in a markdown library
 * for the two bits of inline formatting the lessons actually use.
 */

// Splits on the markers but keeps them, so the runs can be styled in order.
const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function InlineText({ value, style }) {
  const runs = String(value ?? '').split(INLINE_PATTERN).filter(Boolean);

  return (
    <Text style={style}>
      {runs.map((run, index) => {
        if (run.startsWith('**') && run.endsWith('**')) {
          return (
            <Text key={index} style={styles.bold}>
              {run.slice(2, -2)}
            </Text>
          );
        }
        if (run.startsWith('`') && run.endsWith('`')) {
          return (
            <Text key={index} style={styles.inlineCode}>
              {run.slice(1, -1)}
            </Text>
          );
        }
        return run;
      })}
    </Text>
  );
}

function CodeBlock({ value, language }) {
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || 'code'}</Text>
      </View>
      {/* Java lines run long, so the block scrolls sideways instead of wrapping
          mid-statement and breaking the indentation. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{value}</Text>
      </ScrollView>
    </View>
  );
}

function ListBlock({ items, ordered }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listMarker}>{ordered ? `${index + 1}.` : '•'}</Text>
          <InlineText value={item} style={styles.listText} />
        </View>
      ))}
    </View>
  );
}

/**
 * A callout. `variant: 'correction'` marks a place where the lesson corrects an
 * error in the original source material, so it reads differently from a plain aside.
 */
function NoteBlock({ title, variant, blocks }) {
  const isCorrection = variant === 'correction';

  return (
    <View style={[styles.note, isCorrection && styles.noteCorrection]}>
      {title ? (
        <Text style={[styles.noteTitle, isCorrection && styles.noteTitleCorrection]}>
          {title}
        </Text>
      ) : null}
      <Blocks blocks={blocks} />
    </View>
  );
}

/**
 * Tables carry real content in these lessons (primitive type ranges, exception
 * lists), so they scroll sideways rather than being squeezed to phone width.
 */
function TableBlock({ headers, rows }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Some tables are a plain grid with no header row. */}
        {headers.length ? (
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            {headers.map((cell, index) => (
              <View key={index} style={styles.tableCell}>
                <InlineText value={cell} style={styles.tableHeaderText} />
              </View>
            ))}
          </View>
        ) : null}

        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}
          >
            {row.map((cell, cellIndex) => (
              <View key={cellIndex} style={styles.tableCell}>
                <InlineText value={cell} style={styles.tableText} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'code':
      return <CodeBlock value={block.value} language={block.language} />;

    case 'heading':
      return <InlineText value={block.value} style={styles.heading} />;

    case 'list':
      return <ListBlock items={block.items || []} ordered={block.ordered} />;

    case 'note':
      return <NoteBlock title={block.title} variant={block.variant} blocks={block.blocks || []} />;

    case 'table':
      return <TableBlock headers={block.headers || []} rows={block.rows || []} />;

    case 'image':
      return (
        <View style={styles.mediaBlock}>
          <Image source={{ uri: block.url }} style={styles.image} resizeMode="contain" />
          {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
        </View>
      );

    case 'video':
      return (
        <View style={styles.mediaBlock}>
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: `https://www.youtube.com/embed/${block.videoId}` }}
              allowsFullscreenVideo
            />
          </View>
          {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
        </View>
      );

    default:
      return <InlineText value={block.value} style={styles.paragraph} />;
  }
}

export default function Blocks({ blocks }) {
  return (
    <View style={styles.blocks}>
      {(blocks || []).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {
    gap: spacing.lg,
  },
  paragraph: {
    ...type.body,
    color: colors.text,
  },
  bold: {
    fontWeight: '700',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: colors.primaryDark,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    color: colors.text,
    marginTop: spacing.sm,
  },

  list: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  listMarker: {
    ...type.body,
    color: colors.primary,
    fontWeight: '700',
    minWidth: 18,
  },
  listText: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },

  note: {
    backgroundColor: colors.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteCorrection: {
    backgroundColor: colors.errorBg,
    borderLeftColor: colors.error,
  },
  noteTitle: {
    ...type.sectionLabel,
    color: colors.primaryDark,
  },
  noteTitleCorrection: {
    color: colors.error,
  },

  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: colors.surfaceSunken,
  },
  tableRowAlt: {
    backgroundColor: colors.surface,
  },
  tableCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 110,
    maxWidth: 240,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableHeaderText: {
    ...type.small,
    fontWeight: '700',
    color: colors.text,
  },
  tableText: {
    ...type.small,
    color: colors.text,
  },

  codeBlock: {
    backgroundColor: colors.codeBg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  codeHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#3D3029',
  },
  codeLanguage: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primaryLight,
  },
  codeText: {
    color: colors.codeText,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 21,
    padding: spacing.md,
  },

  mediaBlock: {
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.codeBg,
  },
  caption: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
