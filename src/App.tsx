import { motion } from 'motion/react';
import SnakeGame from './components/SnakeGame';
import MusicPlayer from './components/MusicPlayer';
import { Cpu, Terminal, Zap } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-cyber-dark text-white p-6 border-8 border-primary/10 font-sans flex flex-col overflow-hidden">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary rounded-sm shadow-neon-green flex items-center justify-center">
            <div className="w-2 h-2 bg-black"></div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-primary">SYNTH<span className="text-white">SNAKE</span></h1>
        </div>
        
        {/* Score Display (Controlled by SnakeGame but layout here) */}
        <div id="score-display-portal" className="flex gap-12">
          {/* Scores will be injected/styled here via SnakeGame instance or props */}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Sidebar: Playlist Info */}
        <aside className="col-span-3 h-full flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-accent-cyan mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full animate-pulse"></span>
            Neural Stream
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-white/5 border-l-2 border-primary flex flex-col gap-1">
              <p className="text-xs font-bold text-white">Active Signal</p>
              <p className="text-[10px] text-white/40 italic">01. Artificial Intelligence</p>
              <div className="flex gap-1 mt-2">
                {[...Array(4)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, 20, 12, 18, 8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-primary" 
                    style={{ height: 12 }}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 bg-white/[0.02] border-l-2 border-transparent text-white/40">
              <p className="text-xs font-bold">Encrypted Node</p>
              <p className="text-[10px] italic">02. Cybernetic Mind</p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
             <p className="text-[10px] text-white/20 leading-relaxed uppercase tracking-tighter">
              All audio generated via synthetic intelligence. Reproduction of neural frequencies is enabled.
            </p>
          </div>
        </aside>

        {/* Center: Snake Game Window */}
        <main className="col-span-6 flex flex-col items-center">
          <SnakeGame />
        </main>

        {/* Right Sidebar: Status */}
        <aside className="col-span-3 flex flex-col gap-6">
          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent-pink mb-6">System Status</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-white/40 uppercase">Clock Speed</span>
                  <span className="text-xl font-mono">140 <small className="text-[10px] opacity-50">ms</small></span>
                </div>
                <div className="w-full h-1 bg-white/10 relative overflow-hidden">
                  <motion.div 
                    animate={{ x: [-100, 400] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 h-full bg-accent-pink shadow-neon-pink w-1/3" 
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-end pt-2">
                <span className="text-[10px] text-white/40 uppercase">Memory Load</span>
                <span className="text-xl font-mono">X2.5</span>
              </div>
            </div>
          </div>

          <div className="p-6 border border-white/5 rounded-lg opacity-50">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Protocol</h3>
             <p className="text-[9px] font-mono leading-relaxed text-zinc-600">
               RUN_SNAKE.EXE --INIT --NEURAL_LINK=TRUE --AUDIO_SYNC=ON
             </p>
          </div>
        </aside>
      </div>

      {/* Footer: Music Player Controls */}
      <MusicPlayer />
    </div>
  );
}
