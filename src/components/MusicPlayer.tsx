import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PLAYLIST = [
  {
    id: 1,
    title: "Neon Pulse",
    artist: "CYBER_MIND",
    duration: "3:42",
    cover: "/neon_pulse_cover.png", // Will use colored placeholder if not found
    color: "#00f2ff",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "Cyber Drift",
    artist: "SYNTH_ZERO",
    duration: "4:15",
    cover: "/cyber_drift_cover.png",
    color: "#ff007f",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "Synth Soul",
    artist: "NEURAL_ARC",
    duration: "2:58",
    cover: "/synth_soul_cover.png",
    color: "#39ff14",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

export default function MusicPlayer() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentTrack = PLAYLIST[currentTrackIndex];

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log("Audio block:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
    setProgress(0);
    // Auto play next
    setTimeout(() => {
      if (audioRef.current && isPlaying) audioRef.current.play();
    }, 0);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    setProgress(0);
    setTimeout(() => {
      if (audioRef.current && isPlaying) audioRef.current.play();
    }, 0);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const val = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(val) ? 0 : val);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrack);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', nextTrack);
    };
  }, [currentTrackIndex]);

  return (
    <footer className="mt-8 bg-white/[0.02] border border-white/10 p-6 flex items-center gap-8 rounded-xl relative z-10">
      <audio ref={audioRef} src={currentTrack.audio} />
      
      <div className="flex flex-col min-w-[200px]">
        <p className="text-[10px] uppercase tracking-widest text-primary mb-1 font-bold">Now Playing</p>
        <p className="text-lg font-bold truncate">{currentTrack.title} — {currentTrack.artist}</p>
      </div>
      
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex justify-between text-[10px] font-mono text-white/40">
          <span>{audioRef.current ? Math.floor(audioRef.current.currentTime / 60).toString().padStart(2, '0') + ':' + Math.floor(audioRef.current.currentTime % 60).toString().padStart(2, '0') : '00:00'}</span>
          <span>{currentTrack.duration}</span>
        </div>
        <div className="relative h-1 w-full bg-white/10 overflow-hidden">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 px-4">
        <button 
          onClick={prevTrack}
          className="text-white/40 hover:text-white transition-colors"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
        </button>
        <button 
          onClick={nextTrack}
          className="text-white/40 hover:text-white transition-colors"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>

      <div className="flex items-center gap-4 border-l border-white/10 pl-8">
        <Volume2 className="w-4 h-4 text-white/40" />
        <div className="w-24 h-1 bg-white/10">
          <div className="h-full bg-white/60 w-[80%]" />
        </div>
      </div>
    </footer>
  );
}
