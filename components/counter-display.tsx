import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

// ============================================================
// CHILD COMPONENT (CounterDisplay)
// ------------------------------------------------------------
// Walang sariling state. Lahat ay galing sa PARENT via PROPS:
//   - count       -> PROPS DATA (ginagamit bilang character LEVEL)
//   - colors       -> PROPS DATA (theme mula sa parent)
//   - onAdd        \
//   - onMinus       >  PROPS FUNCTIONS (nag-uupdate ng parent state)
//   - onReset      /
// ============================================================

export type ThemeColors = {
  bg: string;
  ink: string;
  sub: string;
  faint: string;
};

type CounterDisplayProps = {
  count: number;
  colors: ThemeColors;
  onAdd: () => void;
  onBoost: () => void;
  onMinus: () => void;
  onReset: () => void;
};

// Ilang level bawat "tier" sa progress bar.
const TIER = 25;

// Class/title base sa kasalukuyang level (count).
function classForLevel(level: number): string {
  if (level < 0) return 'Peasant';
  if (level < 25) return 'Squire';
  if (level < 50) return 'Knight';
  if (level < 75) return 'Crusader';
  if (level < 100) return 'Paladin';
  if (level < 150) return 'Champion';
  return 'Legend';
}

export function CounterDisplay({
  count,
  colors,
  onAdd,
  onBoost,
  onMinus,
  onReset,
}: CounterDisplayProps) {
  // --- Derived display values (galing lang sa count prop) ---
  const level = count;
  const exp = count * 100;
  const lower = Math.floor(count / TIER) * TIER;
  const upper = lower + TIER;
  const progress = Math.max(0, Math.min(1, (count - lower) / TIER));

  return (
    <View style={styles.card}>
      <Text style={[styles.className, { color: colors.ink }]}>{classForLevel(level)}</Text>
      <Text style={[styles.levelText, { color: colors.sub }]}>
        lv. {level} ({exp} exp)
      </Text>

      {/* EXP / level progress bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.faint, borderColor: colors.ink }]}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: colors.ink }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={[styles.barLabel, { color: colors.sub }]}>{lower} lvl</Text>
        <Text style={[styles.barLabel, { color: colors.sub }]}>{upper} lvl</Text>
      </View>

      {/* Primary CTA — malaking +10 boost (deliberate single press) */}
      <PillButton label="INCREASE LEVEL  +10" colors={colors} onPress={onBoost} />

      {/* Tatlong icon buttons = ang tatlong PROPS FUNCTIONS */}
      <View style={styles.circleRow}>
        <CircleButton icon="🗡️" label="ADD" colors={colors} onPress={onAdd} repeatOnHold />
        <CircleButton icon="⚗️" label="MINUS" colors={colors} onPress={onMinus} repeatOnHold />
        <CircleButton icon="🔑" label="RESET" colors={colors} onPress={onReset} />
      </View>

      <Text style={[styles.lessonNote, { color: colors.sub }]}>Parent State → Child Props</Text>
    </View>
  );
}

// ============================================================
// Shared button behavior (hook)
// ------------------------------------------------------------
//  • Isang tap = ISANG tawag lang (sa onPress, hindi sa onPressIn).
//  • Continuous (paulit-ulit) lang kapag naka-hold > HOLD_DELAY.
//  • May spring scale animation kapag pinindot.
// ============================================================
const HOLD_DELAY = 350; // ms bago magsimula ang continuous
const REPEAT_DELAY = 140; // ms bawat ulit habang naka-hold

function useHoldButton(onPress: () => void, repeatOnHold: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHoldRef = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, friction: 5, tension: 140 }).start();

  const clearTimers = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  };

  const onPressIn = () => {
    didHoldRef.current = false;
    animateTo(0.92);
    if (!repeatOnHold) return;
    holdTimeoutRef.current = setTimeout(() => {
      didHoldRef.current = true;
      onPress(); // unang continuous tick
      intervalRef.current = setInterval(onPress, REPEAT_DELAY);
    }, HOLD_DELAY);
  };

  const handlePress = () => {
    if (didHoldRef.current) return; // hinandle na ng hold
    onPress(); // isang tap = isang tawag
  };

  const onPressOut = () => {
    clearTimers();
    animateTo(1);
  };

  useEffect(() => clearTimers, []);

  return { scale, onPress: handlePress, onPressIn, onPressOut };
}

function PillButton({
  label,
  colors,
  onPress,
  repeatOnHold = false,
}: {
  label: string;
  colors: ThemeColors;
  onPress: () => void;
  repeatOnHold?: boolean;
}) {
  const { scale, ...handlers } = useHoldButton(onPress, repeatOnHold);
  return (
    <Animated.View style={[styles.pillWrap, { transform: [{ scale }] }]}>
      <Pressable {...handlers} style={[styles.pill, { backgroundColor: colors.ink }]}>
        <Text style={[styles.pillSpark, { color: colors.bg }]}>✦</Text>
        <Text style={[styles.pillText, { color: colors.bg }]}>{label}</Text>
        <Text style={[styles.pillSpark, { color: colors.bg }]}>✦</Text>
      </Pressable>
    </Animated.View>
  );
}

function CircleButton({
  icon,
  label,
  colors,
  onPress,
  repeatOnHold = false,
}: {
  icon: string;
  label: string;
  colors: ThemeColors;
  onPress: () => void;
  repeatOnHold?: boolean;
}) {
  const { scale, ...handlers } = useHoldButton(onPress, repeatOnHold);
  return (
    <View style={styles.circleItem}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          {...handlers}
          style={[styles.circle, { borderColor: colors.ink, backgroundColor: colors.bg }]}>
          <Text style={styles.circleIcon}>{icon}</Text>
        </Pressable>
      </Animated.View>
      <Text style={[styles.circleLabel, { color: colors.ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  className: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  barTrack: {
    width: '100%',
    height: 16,
    borderRadius: 9,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginTop: 18,
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
  },
  barLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillWrap: {
    width: '100%',
    marginTop: 22,
  },
  pill: {
    borderRadius: 32,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginHorizontal: 14,
  },
  pillSpark: {
    fontSize: 14,
  },
  circleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 22,
  },
  circleItem: {
    alignItems: 'center',
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIcon: {
    fontSize: 26,
  },
  circleLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 7,
  },
  lessonNote: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 22,
  },
});
