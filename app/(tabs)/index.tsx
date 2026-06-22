import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CounterDisplay, ThemeColors } from '@/components/counter-display';
import { useSfx } from '@/hooks/use-sfx';

// Base/starting value para sa counter (= starting LEVEL).
const BASE_COUNT = 100;

// 🤫 HIDDEN: kapag eksaktong umabot sa level na ito, may secret na
// tunog at effect ("6 7" meme easter egg).
const SECRET_LEVEL = 67;

// Dalawang theme — pinipili gamit ang grid button (kaliwa sa header).
const LIGHT: ThemeColors = { bg: '#FFFFFF', ink: '#111111', sub: '#9CA3AF', faint: '#ECECEC' };
const DARK: ThemeColors = { bg: '#0B0B0B', ink: '#F5F5F5', sub: '#7A7A7A', faint: '#242424' };

// Confetti characters (monochrome para bagay sa tema).
const CONFETTI_CHARS = ['✦', '✧', '★', '✪', '⚡'];
const CONFETTI_N = 16;

// Class/title + avatar emoji base sa level.
function tierFor(level: number): { name: string; emoji: string } {
  if (level < 0) return { name: 'Peasant', emoji: '🥚' };
  if (level < 25) return { name: 'Squire', emoji: '🗡️' };
  if (level < 50) return { name: 'Knight', emoji: '🛡️' };
  if (level < 75) return { name: 'Crusader', emoji: '⚔️' };
  if (level < 100) return { name: 'Paladin', emoji: '🦸' };
  if (level < 150) return { name: 'Champion', emoji: '👑' };
  return { name: 'Legend', emoji: '🐉' };
}

// ============================================================
// PARENT COMPONENT (index.tsx)
// ------------------------------------------------------------
// Hawak nito ang STATE (`count`, `dark`). Ipinapasa ang count
// (data), theme colors, at update functions sa CHILD bilang PROPS.
// ============================================================
export default function ParentScreen() {
  // STATE — single source of truth.
  const [count, setCount] = useState(BASE_COUNT);
  const [dark, setDark] = useState(false);
  const [floatLabel, setFloatLabel] = useState('+1');
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('LEVEL UP!');
  const [combo, setCombo] = useState(0);
  const [happy, setHappy] = useState(false);

  const colors = dark ? DARK : LIGHT;
  const tier = tierFor(count);

  // Mirror ng count — para tama kahit mabilis ang hold-to-repeat.
  const countRef = useRef(BASE_COUNT);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secretChain = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sfx = useSfx();

  // --- Continuous animations ---
  const aura = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  // --- Animations ---
  const pop = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current; 
  const redFlash = useRef(new Animated.Value(0)).current; 
  const shake = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current; 

  // Random trajectories ng confetti (fixed sa mount).
  const confetti = useRef(
    Array.from({ length: CONFETTI_N }).map(() => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 130;
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - 20,
        rot: (Math.random() * 2 - 1) * 360,
        scale: 0.7 + Math.random() * 0.9,
        char: CONFETTI_CHARS[Math.floor(Math.random() * CONFETTI_CHARS.length)],
      };
    })
  ).current;

  
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(aura, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(aura, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [aura]);

  
  useEffect(() => {
    return () => {
      if (comboTimer.current) clearTimeout(comboTimer.current);
      if (secretChain.current) clearTimeout(secretChain.current);
    };
  }, []);

  
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  // --- Effect helpers ---
  const reactPop = (dir: 'up' | 'down', label: string, popTo = dir === 'up' ? 1.35 : 0.7) => {
    pop.setValue(popTo);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }).start();

    setFloatLabel(label);
    labelY.setValue(0);
    labelOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(labelY, {
        toValue: dir === 'up' ? -64 : 64,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(labelOpacity, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start();
  };

  const flashBanner = (text: string) => {
    setBannerText(text);
    setShowBanner(true);
    banner.setValue(0);
    Animated.sequence([
      Animated.spring(banner, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.delay(800),
      Animated.timing(banner, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowBanner(false));
  };

  // Sink/lundag pababa — reaksyon kapag bumaba ng class (rank down).
  const doDrop = () => {
    drop.setValue(0);
    Animated.sequence([
      Animated.timing(drop, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(drop, { toValue: 0, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  // Pulang kislap (damage flash) kapag bumababa ang level/rank.
  const doRedFlash = (peak: number) => {
    redFlash.setValue(0);
    Animated.sequence([
      Animated.timing(redFlash, { toValue: peak, duration: 80, useNativeDriver: true }),
      Animated.timing(redFlash, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  };

  // 🤫 Secret easter egg — kapag eksaktong umabot sa SECRET_LEVEL.
  // Tinatawag tuwing magbabago ang count (pataas man o pababa).
  // Babalik ng true kung na-trigger (para huwag nang tumunog ang normal na sfx).
  const maybeSecret = (next: number): boolean => {
    if (next !== SECRET_LEVEL) return false;
    flashBanner('6️⃣ 7️⃣ !!');
    fireConfetti();
    doShake();
    sfx.playSecret();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    pop.setValue(1.6);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 3.5 }).start();

    // Kapag tapos na ang secret67 sound + animations, i-trigger ang
    // pangalawang secret sound (follow-up).
    if (secretChain.current) clearTimeout(secretChain.current);
    secretChain.current = setTimeout(() => {
      sfx.playSecret2();
      fireConfetti();
      doShake();
      flashBanner('😎');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1100);
    return true;
  };

  const fireConfetti = () => {
    burst.setValue(0);
    Animated.timing(burst, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const doShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const bumpCombo = () => {
    setCombo((c) => c + 1);
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(0), 700);
  };

  const clearCombo = () => {
    setCombo(0);
    if (comboTimer.current) clearTimeout(comboTimer.current);
  };

  // --- PROPS FUNCTIONS (passed sa child) ---
  const handleAdd = () => {
    const prev = countRef.current;
    const next = prev + 1;
    countRef.current = next;
    setCount(next);

    if (maybeSecret(next)) {
      reactPop('up', '+1');
      bumpCombo();
      return;
    }

    if (tierFor(next).name !== tierFor(prev).name) {
      flashBanner('LEVEL UP!');
      fireConfetti();
      doShake();
      sfx.playLevelUp();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      sfx.playAdd();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    reactPop('up', '+1');
    bumpCombo();
  };

  // INCREASE LEVEL — malaking +10 power boost (laging "level up" feel).
  const handleBoost = () => {
    const prev = countRef.current;
    const next = prev + 10;
    countRef.current = next;
    setCount(next);

    if (maybeSecret(next)) {
      reactPop('up', '+10', 1.55);
      clearCombo();
      return;
    }

    flashBanner('POWER UP +10');
    fireConfetti();
    doShake();
    sfx.playBoost();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reactPop('up', '+10', 1.55);
    clearCombo();
  };

  const handleMinus = () => {
    const prev = countRef.current;
    const next = prev - 1;
    countRef.current = next;
    setCount(next);

    if (maybeSecret(next)) {
      reactPop('down', '-1');
      clearCombo();
      return;
    }

    if (tierFor(next).name !== tierFor(prev).name) {
      // Bumaba ng class — kakaibang tunog at animation (rank down).
      flashBanner('RANK DOWN');
      doDrop();
      doShake();
      doRedFlash(0.6); // mas malakas na pulang kislap
      sfx.playLevelDown();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      reactPop('down', '-1', 0.5);
    } else {
      sfx.playMinus();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      doRedFlash(0.28); // banayad na pulang kislap kada -1
      reactPop('down', '-1');
    }
    clearCombo();
  };

  const handleReset = () => {
    countRef.current = BASE_COUNT;
    setCount(BASE_COUNT);
    sfx.playReset();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    doShake();
    clearCombo();
  };

  // --- HEADER BUTTON actions ---
  const toggleTheme = () => {
    setDark((d) => !d);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const celebrate = () => {
    fireConfetti();
    doShake();
    flashBanner('WOOHOO! 🎉');
    sfx.playLevelUp();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // pasayahin pansamantala ang avatar emoji
    setHappy(true);
    pop.setValue(1.4);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 3.5 }).start();
    setTimeout(() => setHappy(false), 1200);
  };

  // --- Interpolations ---
  const auraScale = aura.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.35] });
  const auraOpacity = aura.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const float = floatY.interpolate({ inputRange: [0, 1], outputRange: [4, -8] });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const bannerScale = banner.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });
  const dropY = drop.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <IconButton onPress={toggleTheme} style={[styles.iconBox, { borderColor: colors.ink }]}>
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.gridDot, { backgroundColor: colors.ink }]} />
            ))}
          </View>
        </IconButton>

        <View style={styles.headerCenter}>
          <Text style={[styles.brand, { color: colors.ink }]}>BROKEN SWORDS</Text>
          <Text style={[styles.brandSub, { color: colors.sub }]}>
            {dark ? 'dark mode 🌙' : 'lv up ↑'}
          </Text>
        </View>

        <IconButton onPress={celebrate} style={[styles.iconCircle, { borderColor: colors.ink }]}>
          <Text style={[styles.smiley, { color: colors.ink }]}>{happy ? '🥳' : '☺'}</Text>
        </IconButton>
      </View>

      {/* ===== HERO: POWER CORE ===== */}
      <Animated.View
        style={[
          styles.hero,
          { borderColor: colors.ink, backgroundColor: colors.bg, transform: [{ translateX: shakeX }] },
        ]}>
        <Text style={[styles.spark, styles.sparkTL, { color: colors.ink }]}>✦</Text>
        <Text style={[styles.spark, styles.sparkTR, { color: colors.ink }]}>✦</Text>
        <Text style={[styles.spark, styles.sparkBL, { color: colors.ink }]}>✦</Text>

        {/* Combo indicator */}
        {combo >= 3 && (
          <View style={[styles.combo, { borderColor: colors.ink }]}>
            <Text style={[styles.comboText, { color: colors.ink }]}>🔥 COMBO x{combo}</Text>
          </View>
        )}

        {/* Pumipintig na aura */}
        <Animated.View
          style={[
            styles.aura,
            { borderColor: colors.ink, opacity: auraOpacity, transform: [{ scale: auraScale }] },
          ]}
        />

        {/* Lumulutang na +1 / -1 */}
        <Animated.Text
          style={[
            styles.floatLabel,
            { color: colors.ink, opacity: labelOpacity, transform: [{ translateY: labelY }] },
          ]}>
          {floatLabel}
        </Animated.Text>

        {/* Avatar */}
        <Animated.Text
          style={[
            styles.avatar,
            {
              transform: [
                { translateY: Animated.add(float, dropY) },
                { scale: pop },
                { rotate: spinDeg },
              ],
            },
          ]}>
          {happy ? '🥳' : tier.emoji}
        </Animated.Text>

        {/* Confetti overlay */}
        <View style={styles.confettiLayer} pointerEvents="none">
          {confetti.map((p, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.confetti,
                {
                  color: colors.ink,
                  opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                    { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
                    {
                      rotate: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${p.rot}deg`],
                      }),
                    },
                    {
                      scale: burst.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0, p.scale, p.scale * 0.8],
                      }),
                    },
                  ],
                },
              ]}>
              {p.char}
            </Animated.Text>
          ))}
        </View>

        {/* Pulang damage flash kapag bumababa ang level/rank */}
        <Animated.View style={[styles.redFlash, { opacity: redFlash }]} pointerEvents="none" />

        {/* Banner — LEVEL UP! / POWER UP / RANK DOWN / WOOHOO! */}
        {showBanner && (
          <Animated.View
            style={[
              styles.banner,
              { backgroundColor: colors.ink, opacity: banner, transform: [{ scale: bannerScale }] },
            ]}>
            <Text style={[styles.bannerText, { color: colors.bg }]}>{bannerText}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* ===== CHILD COMPONENT (props-driven RPG card) ===== */}
      <CounterDisplay
        count={count}
        colors={colors}
        onAdd={handleAdd}
        onBoost={handleBoost}
        onMinus={handleMinus}
        onReset={handleReset}
      />
    </SafeAreaView>
  );
}

// Maliit na pressable na may spring scale — para sa header icons.
function IconButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: object | object[];
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 5 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.88)}
        onPressOut={() => to(1)}
        style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridDot: { width: 6, height: 6, borderRadius: 1.5 },
  headerCenter: { alignItems: 'center' },
  brand: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  brandSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smiley: { fontSize: 18, fontWeight: '700', marginTop: -1 },

  // --- Hero / Power Core ---
  hero: {
    height: 230,
    borderWidth: 2,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aura: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  avatar: { fontSize: 96 },
  floatLabel: {
    position: 'absolute',
    top: '32%',
    fontSize: 34,
    fontWeight: '900',
  },
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF2A2A',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    fontSize: 22,
  },
  combo: {
    position: 'absolute',
    top: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  comboText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  banner: {
    position: 'absolute',
    bottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bannerText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  // --- Sparkles ---
  spark: { position: 'absolute', fontSize: 16 },
  sparkTL: { top: 16, left: 18 },
  sparkTR: { top: 16, right: 18 },
  sparkBL: { bottom: 16, left: 18, fontSize: 12 },
});
