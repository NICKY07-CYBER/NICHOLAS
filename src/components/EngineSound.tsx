import { useEffect, useRef } from 'react';
import { useRacingStore } from '../hooks/useRacingStore';

export const EngineSound = () => {
  const { speed, isNitroActive } = useRacingStore();
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const filter = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    // Initialize Audio Context on first interaction
    const initAudio = () => {
      if (audioCtx.current) return;
      
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      oscillator.current = audioCtx.current.createOscillator();
      gainNode.current = audioCtx.current.createGain();
      filter.current = audioCtx.current.createBiquadFilter();

      oscillator.current.type = 'sawtooth';
      filter.current.type = 'lowpass';
      filter.current.frequency.value = 800;

      oscillator.current.connect(filter.current);
      filter.current.connect(gainNode.current);
      gainNode.current.connect(audioCtx.current.destination);

      gainNode.current.gain.value = 0;
      oscillator.current.start();
    };

    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('mousedown', initAudio, { once: true });

    return () => {
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('mousedown', initAudio);
      if (audioCtx.current) {
        audioCtx.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!oscillator.current || !gainNode.current || !filter.current) return;

    const baseFreq = 40;
    const targetFreq = baseFreq + (speed * 0.8) + (isNitroActive ? 40 : 0);
    const targetGain = Math.min(0.15, (speed / 100) + 0.05);

    oscillator.current.frequency.setTargetAtTime(targetFreq, audioCtx.current!.currentTime, 0.1);
    gainNode.current.gain.setTargetAtTime(targetGain, audioCtx.current!.currentTime, 0.1);
    filter.current.frequency.setTargetAtTime(targetFreq * 2, audioCtx.current!.currentTime, 0.1);

  }, [speed, isNitroActive]);

  return null;
};
