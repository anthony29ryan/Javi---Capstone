import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, fonts, radius, spacing, type } from '../theme/colors';
import { useScaledStyles, useTextSize } from '../context/TextSizeContext';

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

export function InlineText({ value, style }) {
  const styles = useScaledStyles(baseStyles);
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

function CodeBlock({ value, language, label }) {
  const styles = useScaledStyles(baseStyles);
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        {/* The screen can pass a label naming the module the example belongs
            to; otherwise fall back to the block's own language. */}
        <Text style={styles.codeLanguage}>{label || language || 'code'}</Text>
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
  const styles = useScaledStyles(baseStyles);
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
  const styles = useScaledStyles(baseStyles);
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

// Approximate advance widths at the table's 12.5px size. Monospace is the
// wider of the two, and these cells are full of `code`, so measuring
// everything as proportional text under-sizes those columns badly enough that
// short expressions wrap mid-statement.
const TABLE_TEXT_CHAR = 6.2;
const TABLE_CODE_CHAR = 7.5;
const TABLE_CELL_PADDING = spacing.md * 2;
const TABLE_MIN_COLUMN = 72;
const TABLE_MAX_COLUMN = 230;

// Firestore cannot nest an array inside an array, so publishContent wraps each
// row as { cells: [...] }. Accept the authored plain-array shape too, so a
// table renders the same whichever it came from.
function toCells(row) {
  return Array.isArray(row) ? row : row?.cells || [];
}

/**
 * Roughly how wide a cell's text wants to be, run by run.
 *
 * Splitting on the inline markers does two jobs at once: the markers are
 * formatting rather than characters the reader sees, so they drop out of the
 * count, and each run can be charged at the rate for the font it will actually
 * render in.
 */
function measuredWidth(value) {
  return String(value ?? '')
    .split(INLINE_PATTERN)
    .filter(Boolean)
    .reduce((total, run) => {
      if (run.startsWith('`') && run.endsWith('`')) {
        return total + (run.length - 2) * TABLE_CODE_CHAR;
      }
      if (run.startsWith('**') && run.endsWith('**')) {
        return total + (run.length - 4) * TABLE_TEXT_CHAR;
      }
      return total + run.length * TABLE_TEXT_CHAR;
    }, 0);
}

/**
 * One width per column, from the longest cell in that column.
 *
 * Every row then uses the same widths, which is what makes the grid line up.
 * Sizing each cell to its own content instead — the obvious thing, and what
 * this did before — lets each row pick its own column boundaries, so nothing
 * aligns vertically and it stops reading as a table at all.
 */
function measureColumns(headers, rows) {
  const bodies = rows.map(toCells);
  const columnCount = Math.max(headers.length, ...bodies.map((cells) => cells.length), 0);

  return Array.from({ length: columnCount }, (_, column) => {
    const widths = [measuredWidth(headers[column]), ...bodies.map((c) => measuredWidth(c[column]))];
    const ideal = Math.max(...widths, 0) + TABLE_CELL_PADDING;
    return Math.round(Math.min(TABLE_MAX_COLUMN, Math.max(TABLE_MIN_COLUMN, ideal)));
  });
}

/**
 * Tables carry real content in these lessons (primitive type ranges, exception
 * lists), so they scroll sideways rather than being squeezed to phone width.
 */
function TableBlock({ headers, rows }) {
  const styles = useScaledStyles(baseStyles);
  const { scale } = useTextSize();
  // Bigger reading text needs wider columns to keep the same line breaks.
  const widths = measureColumns(headers, rows).map((width) => Math.round(width * scale));
  if (widths.length === 0) return null;

  const renderRow = (cells, { key, header = false, first = false, alt = false }) => (
    <View
      key={key}
      style={[
        styles.tableRow,
        !first && styles.tableRowDivided,
        alt && styles.tableRowAlt,
        header && styles.tableHeaderRow,
      ]}
    >
      {widths.map((width, column) => (
        <View
          key={column}
          style={[
            styles.tableCell,
            { width },
            column < widths.length - 1 && styles.tableCellDivided,
          ]}
        >
          <InlineText
            value={cells[column] ?? ''}
            style={header ? styles.tableHeaderText : styles.tableText}
          />
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Some tables are a plain grid with no header row. */}
        {headers.length ? renderRow(headers, { key: 'head', header: true, first: true }) : null}

        {rows.map((row, rowIndex) =>
          renderRow(toCells(row), {
            key: rowIndex,
            first: !headers.length && rowIndex === 0,
            alt: rowIndex % 2 === 1,
          })
        )}
      </View>
    </ScrollView>
  );
}

function Block({ block, codeLabel }) {
  const styles = useScaledStyles(baseStyles);
  switch (block.type) {
    case 'code':
      return <CodeBlock value={block.value} language={block.language} label={codeLabel} />;

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

export default function Blocks({ blocks, codeLabel }) {
  const styles = useScaledStyles(baseStyles);
  return (
    <View style={styles.blocks}>
      {(blocks || []).map((block, index) => (
        <Block key={index} block={block} codeLabel={codeLabel} />
      ))}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  blocks: {
    gap: spacing.lg,
  },
  paragraph: {
    ...type.body,
    color: colors.text,
  },
  bold: {
    fontFamily: fonts.bold,
  },
  inlineCode: {
    fontFamily: fonts.monoRegular,
    // No size of its own: inline code inherits whatever it sits in, so it
    // stays in step with body text at 14 and with table text at 12.5. Pinning
    // it at 14 made code in a table taller than the row around it.
    color: colors.primaryDark,
  },
  heading: {
    fontSize: 18,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
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
    // Cells wrap to different heights, so they hang from a common top edge
    // rather than centring independently.
    alignItems: 'stretch',
  },
  tableRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.surface,
  },
  tableHeaderRow: {
    backgroundColor: colors.surfaceSunken,
  },
  tableCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'flex-start',
  },
  tableCellDivided: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tableHeaderText: {
    ...type.small,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  tableText: {
    ...type.small,
    color: colors.text,
  },

  codeBlock: {
    backgroundColor: colors.codeBg,
    borderRadius: radius.lg,
    padding: 18,
    overflow: 'hidden',
  },
  codeHeader: {
    marginBottom: spacing.md,
  },
  codeLanguage: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.14,
    textTransform: 'uppercase',
    color: colors.codeLabel,
  },
  codeText: {
    color: colors.codeText,
    fontFamily: fonts.monoRegular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.75,
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
