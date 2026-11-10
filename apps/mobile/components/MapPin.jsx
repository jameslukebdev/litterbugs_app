import { StyleSheet, Text, View } from 'react-native';
import BrandBug from './BrandBug';
import { colors, fonts } from '../lib/theme';

// Map pins and groups in the website's bug style (apps/web/app/globals.css,
// `.report-map-marker` / `.report-map-cluster`): a white pill or circle with the
// state's bug (ladybug = needs a cleanup, caterpillar = being cleaned, flower =
// cleaned up), visible text only for money or a group count, and a pointed tail
// whose tip is the exact spot. Anchor the marker at { x: 0.5, y: 1 }.

export const PIN_HEIGHT = 34;
export const PIN_TAIL = 9;

// Same artwork sizes as the website's BUGS table in lib/map-marker-glyph.ts.
const BUG_SIZE = {
  open: { kind: 'ladybug', width: 18, height: 20 },
  busy: { kind: 'caterpillar', width: 22, height: 22 },
  done: { kind: 'flower', width: 17, height: 16 },
};

// Resting and selected fill/edge per state, from the website's pin CSS.
const TONES = {
  open: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#ED8F97', selectedFill: '#FFF0F1' },
  busy: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#8CC366', selectedFill: '#ECF6E3' },
  done: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#6CC6AF', selectedFill: '#E2F8F3' },
};

/** Website pin kind for a report's cleanup state. */
export function pinKind(state) {
  if (state === 'completed') return 'done';
  if (state === 'claimed' || state === 'completion_submitted' || state === 'changes_requested') return 'busy';
  return 'open';
}

export default function MapPin({ kind = 'open', text = null, selected = false }) {
  const bug = BUG_SIZE[kind] || BUG_SIZE.open;
  const tone = TONES[kind] || TONES.open;
  const edge = selected ? tone.selectedEdge : tone.edge;
  const fill = selected ? tone.selectedFill : tone.fill;
  const iconOnly = !text;
  const small = iconOnly && kind === 'done';
  const size = small ? 30 : PIN_HEIGHT;
  return (
    <View collapsable={false} style={[styles.wrap, selected && styles.selected]}>
      <View style={[
        styles.pill,
        { height: size, minWidth: size, borderRadius: size / 2, borderColor: edge, backgroundColor: fill },
        iconOnly ? { width: size, paddingLeft: 0, paddingRight: 0 } : null,
      ]}>
        <BrandBug kind={bug.kind} style={{ width: bug.width, height: bug.height }} />
        {text ? <Text allowFontScaling={false} numberOfLines={1} style={styles.text}>{text}</Text> : null}
      </View>
      {/* Tail: an edge-coloured triangle with a smaller fill triangle on top. */}
      <View style={[styles.tailEdge, { borderTopColor: edge }]} />
      <View style={[styles.tailFill, { borderTopColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: PIN_TAIL,
    shadowColor: '#2A225A',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
  selected: { transform: [{ translateY: -3 }, { scale: 1.08 }] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingLeft: 7,
    paddingRight: 12,
    borderWidth: 2,
    elevation: 3,
  },
  text: { color: colors.ink, fontFamily: fonts.heading, fontSize: 15, lineHeight: 18 },
  tailEdge: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailFill: {
    position: 'absolute',
    bottom: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
