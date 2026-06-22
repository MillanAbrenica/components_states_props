import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';

// ============================================================
// useSfx — maliliit na sound effects para sa counter actions.
// Gumagamit ng expo-audio. Bawat tunog ay sariling player; ang
// seekTo(0) bago mag-play ay nag-uulit mula sa simula (kahit
// mabilis ang pag-pindot / hold-to-repeat).
// ============================================================
export function useSfx() {
  const addPlayer = useAudioPlayer(require('@/assets/sounds/add.wav'));
  const minusPlayer = useAudioPlayer(require('@/assets/sounds/minus.wav'));
  const resetPlayer = useAudioPlayer(require('@/assets/sounds/reset.wav'));
  const boostPlayer = useAudioPlayer(require('@/assets/sounds/boost.wav'));
  const levelUpPlayer = useAudioPlayer(require('@/assets/sounds/levelup.wav'));
  const levelDownPlayer = useAudioPlayer(require('@/assets/sounds/leveldown.wav'));
  const secretPlayer = useAudioPlayer(require('@/assets/sounds/secret67.wav'));
  const secret2Player = useAudioPlayer(require('@/assets/sounds/secret67b.mp3'));

  const replay = useCallback((player: ReturnType<typeof useAudioPlayer>) => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // huwag i-crash ang UI kung pumalya ang audio
    }
  }, []);

  return {
    playAdd: useCallback(() => replay(addPlayer), [replay, addPlayer]),
    playMinus: useCallback(() => replay(minusPlayer), [replay, minusPlayer]),
    playReset: useCallback(() => replay(resetPlayer), [replay, resetPlayer]),
    playBoost: useCallback(() => replay(boostPlayer), [replay, boostPlayer]),
    playLevelUp: useCallback(() => replay(levelUpPlayer), [replay, levelUpPlayer]),
    playLevelDown: useCallback(() => replay(levelDownPlayer), [replay, levelDownPlayer]),
    playSecret: useCallback(() => replay(secretPlayer), [replay, secretPlayer]),
    playSecret2: useCallback(() => replay(secret2Player), [replay, secret2Player]),
  };
}
