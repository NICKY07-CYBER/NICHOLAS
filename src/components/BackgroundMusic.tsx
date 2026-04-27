import { useEffect, useRef } from 'react';

export const BackgroundMusic = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const isStarted = useRef(false);

  useEffect(() => {
    const startBGM = () => {
      if (isStarted.current) return;
      isStarted.current = true;
      
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBassLoop = () => {
        const now = audioCtx.current!.currentTime;
        const noteLength = 0.5; // 120 BPM roughly
        
        // Loop every 4 beats
        for (let i = 0; i < 16; i++) {
          const time = now + (i * 0.25);
          // Simple techno bass pattern
          if (i % 4 === 0 || i % 4 === 2) {
             const osc = audioCtx.current!.createOscillator();
             const gain = audioCtx.current!.createGain();
             const filter = audioCtx.current!.createBiquadFilter();
             
             osc.type = 'sine';
             osc.frequency.setValueAtTime(55, time); // A1
             osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
             
             gain.gain.setValueAtTime(0.3, time);
             gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
             
             filter.type = 'lowpass';
             filter.frequency.value = 150;
             
             osc.connect(filter);
             filter.connect(gain);
             gain.connect(audioCtx.current!.destination);
             
             osc.start(time);
             osc.stop(time + 0.25);
          }
        }
        
        // Schedule next bar
        setTimeout(playBassLoop, 4000);
      };

      playBassLoop();
    };

    window.addEventListener('mousedown', startBGM, { once: true });
    window.addEventListener('keydown', startBGM, { once: true });

    return () => {
      if (audioCtx.current) {
        audioCtx.current.close();
      }
    };
  }, []);

  return null;
};
