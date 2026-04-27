import { create } from 'zustand';

interface RacingState {
  speed: number;
  nitro: number; // 0 to 100
  isNitroActive: boolean;
  lap: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  isReplaying: boolean;
  recording: Array<{
    time: number;
    pos: [number, number, number];
    rot: [number, number, number, number];
    camPos: [number, number, number];
    isNitro: boolean;
  }>;
  setReplaying: (active: boolean) => void;
  saveRecording: (recording: any[]) => void;
  setSpeed: (speed: number) => void;
  setNitro: (nitro: number) => void;
  setIsNitroActive: (active: boolean) => void;
  completeLap: () => void;
  updateTimer: (delta: number) => void;
  resetRace: () => void;
}

export const useRacingStore = create<RacingState>((set) => ({
  speed: 0,
  nitro: 100,
  isNitroActive: false,
  lap: 1,
  currentLapTime: 0,
  lastLapTime: 0,
  bestLapTime: 0,
  isReplaying: false,
  recording: [],
  setSpeed: (speed) => set({ speed }),
  setNitro: (nitro) => set({ nitro }),
  setIsNitroActive: (isNitroActive) => set({ isNitroActive }),
  setReplaying: (isReplaying) => set({ isReplaying }),
  saveRecording: (recording) => set({ recording }),
  completeLap: () => set((state) => {
    const isNewBest = state.bestLapTime === 0 || state.currentLapTime < state.bestLapTime;
    return {
      lap: state.lap + 1,
      lastLapTime: state.currentLapTime,
      bestLapTime: isNewBest ? state.currentLapTime : state.bestLapTime,
      currentLapTime: 0,
      nitro: Math.min(100, state.nitro + 30) // Bonus nitro for finishing lap
    };
  }),
  updateTimer: (delta) => set((state) => ({ currentLapTime: state.currentLapTime + delta })),
  resetRace: () => set({
    lap: 1,
    currentLapTime: 0,
    lastLapTime: 0,
    bestLapTime: 0,
    nitro: 100,
    isNitroActive: false,
    speed: 0
  }),
}));
