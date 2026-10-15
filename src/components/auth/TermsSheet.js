import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { LEGAL_CONTACT, LEGAL_DOCS, TERMS_UPDATED } from '../../constants/legal';
import { authColors, authFonts } from '../../theme/authTheme';

const TABS = [
  ['terms', 'Terms'],
  ['privacy', 'Privacy'],
];
// How close to the bottom (px) counts as having reached the end.
const END_SLACK = 8;

function Section({ index, section }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.sectionBody}>
        <Text style={styles.sectionHeading}>{section.h}</Text>
        {section.body.map((part, i) =>
          typeof part === 'string' ? (
            <Text key={i} style={styles.paragraph}>
              {part}
            </Text>
          ) : (
            <View key={i} style={styles.list}>
              {part.label ? <Text style={styles.listLabel}>{part.label}</Text> : null}
              {part.items.map((item) => (
                <View key={item} style={styles.listItem}>
                  <Text style={styles.paragraph}>•</Text>
                  <Text style={[styles.paragraph, styles.listText]}>{item}</Text>
                </View>
              ))}
            </View>
          )
        )}
      </View>
    </View>
  );
}

/**
 * The sign-up Terms popup (design frame 04). Both documents must be scrolled
 * to the end before the agree box can be ticked, and only then does "Agree
 * and continue" call onAccept. Stays mounted while hidden, so reading
 * progress survives closing and reopening it.
 */
export default function TermsSheet({ visible, initialTab = 'terms', onClose, onAccept }) {
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState(initialTab);
  const [read, setRead] = useState({ terms: false, privacy: false });
  const [checked, setChecked] = useState(false);
  const scroll = useRef(null);
  const box = useRef({ view: 0, content: 0 });

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const bothRead = read.terms && read.privacy;
  const canAccept = bothRead && checked;
  const doc = LEGAL_DOCS[tab];
  const unread = TABS.filter(([id]) => !read[id]).map(([, label]) => label);

  function markReadIfAtEnd(offsetY) {
    const { view, content } = box.current;
    // A document short enough to fit without scrolling counts as read once shown.
    if (view && content && offsetY + view >= content - END_SLACK && !read[tab]) {
      setRead((current) => ({ ...current, [tab]: true }));
    }
  }

  function pickTab(id) {
    setTab(id);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.card, { height: Math.min(600, height - 80) }]}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>Legal · Updated {TERMS_UPDATED}</Text>
                <Text style={styles.title}>{doc.title}</Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <Text style={styles.closeMark}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.tabs}>
              {TABS.map(([id, label]) => {
                const on = id === tab;
                return (
                  <Pressable
                    key={id}
                    onPress={() => pickTab(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[styles.tab, on && styles.tabOn]}
                  >
                    <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{label}</Text>
                    {read[id] ? <Text style={styles.tabMark}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView
            ref={scroll}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            scrollEventThrottle={100}
            onScroll={(e) => markReadIfAtEnd(e.nativeEvent.contentOffset.y)}
            onLayout={(e) => {
              box.current.view = e.nativeEvent.layout.height;
              markReadIfAtEnd(0);
            }}
            onContentSizeChange={(_, contentHeight) => {
              box.current.content = contentHeight;
              markReadIfAtEnd(0);
            }}
          >
            <Text style={styles.intro}>{doc.intro}</Text>
            {doc.sections.map((section, i) => (
              <Section key={section.h} index={i} section={section} />
            ))}
            <Text style={styles.contact}>
              Questions? Write to <Text style={styles.contactEmail}>{LEGAL_CONTACT}</Text>
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={[styles.hint, bothRead && styles.hintDone]}>
              {bothRead
                ? 'You have read both documents.'
                : `Scroll to the end of ${unread.join(' and ')} to continue.`}
            </Text>
            <Pressable
              onPress={() => setChecked((value) => !value)}
              disabled={!bothRead}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !bothRead }}
              style={[styles.agreeRow, !bothRead && styles.agreeRowOff]}
            >
              <View style={[styles.box, checked && styles.boxOn]}>
                {checked ? <Text style={styles.boxMark}>✓</Text> : null}
              </View>
              <Text style={styles.agreeLabel}>
                I have read and agree to the Terms and Conditions and Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              disabled={!canAccept}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canAccept }}
              style={({ pressed }) => [
                styles.accept,
                canAccept && styles.acceptOn,
                canAccept && pressed && styles.acceptPressed,
              ]}
            >
              <Text style={[styles.acceptLabel, canAccept && styles.acceptLabelOn]}>Agree and continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,22,34,.45)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: authColors.surface,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  eyebrow: {
    fontFamily: authFonts.semiBold,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.12,
    textTransform: 'uppercase',
    color: authColors.muted,
  },
  title: {
    fontFamily: authFonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.25,
    letterSpacing: -21 * 0.01,
    color: authColors.ink,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface2,
  },
  closeMark: {
    fontSize: 16,
    color: authColors.ink2,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 20,
    backgroundColor: authColors.surface2,
    marginTop: 14,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabOn: {
    backgroundColor: authColors.surface,
    shadowColor: authColors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  tabLabel: {
    fontFamily: authFonts.bold,
    fontSize: 13,
    color: authColors.ink2,
  },
  tabLabelOn: {
    color: authColors.ink,
  },
  tabMark: {
    fontFamily: authFonts.bold,
    fontSize: 12,
    color: '#2F7F5E',
  },
  scroll: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: authColors.line,
  },
  scrollContent: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 20,
  },
  intro: {
    marginTop: 12,
    fontFamily: authFonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: authColors.ink2,
  },
  section: {
    flexDirection: 'row',
    gap: 14,
  },
  sectionNumber: {
    width: 24,
    fontFamily: authFonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.6,
    color: authColors.accentDeep,
  },
  sectionBody: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeading: {
    fontFamily: authFonts.bold,
    fontSize: 15.5,
    lineHeight: 15.5 * 1.35,
    color: authColors.ink,
  },
  paragraph: {
    marginTop: 6,
    fontFamily: authFonts.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.6,
    color: authColors.ink2,
  },
  list: {
    marginTop: 4,
  },
  listLabel: {
    marginTop: 8,
    fontFamily: authFonts.semiBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.6,
    color: authColors.ink,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
  },
  listText: {
    flex: 1,
  },
  contact: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: authColors.line,
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: authColors.ink2,
  },
  contactEmail: {
    fontFamily: authFonts.semiBold,
    color: authColors.accentDeep,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: authColors.line,
  },
  hint: {
    marginHorizontal: 2,
    marginBottom: 12,
    fontFamily: authFonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: authColors.muted,
  },
  hintDone: {
    color: '#2F7F5E',
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 2,
    marginBottom: 14,
  },
  agreeRowOff: {
    opacity: 0.45,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(46,49,65,.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  boxMark: {
    fontFamily: authFonts.semiBold,
    fontSize: 13,
    color: authColors.white,
  },
  agreeLabel: {
    flex: 1,
    fontFamily: authFonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: authColors.ink,
  },
  accept: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.surface2,
  },
  acceptOn: {
    backgroundColor: authColors.button,
  },
  acceptPressed: {
    backgroundColor: authColors.buttonPressed,
  },
  acceptLabel: {
    fontFamily: authFonts.semiBold,
    fontSize: 15,
    color: authColors.muted,
  },
  acceptLabelOn: {
    color: authColors.white,
  },
});
