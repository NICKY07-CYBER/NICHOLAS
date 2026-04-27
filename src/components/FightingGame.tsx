import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Fighter } from '../lib/Fighter';
import { AIController } from '../lib/AI';
import { CHARACTERS, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, FighterState } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Zap, Trophy, RefreshCcw, Home } from 'lucide-react';

// Sound Helper
class SoundEngine {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) this.ctx = new AudioContext();
  }

  playHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpecial() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  startMusic() {
     if (!this.ctx) return;
     // Simple bass pulse
     const loop = () => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, this.ctx!.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.5);
        setTimeout(loop, 500);
     };
     loop();
  }
}

const sounds = new SoundEngine();

export default function FightingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'MENU' | 'FIGHT' | 'GAME_OVER'>('MENU');
  const [playerChar, setPlayerChar] = useState<string>('naveen');
  const [opponentChar, setOpponentChar] = useState<string>('ravi');
  const [winner, setWinner] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  
  const fightersRef = useRef<{ p1: Fighter; p2: Fighter } | null>(null);
  const aiRef = useRef<AIController | null>(null);
  const [hudState, setHudState] = useState({ p1H: 100, p2H: 100, p1S: 0, p2S: 0 });

  const keys = useRef<Set<string>>(new Set());

  const startGame = (pChar: string) => {
    setPlayerChar(pChar);
    const oChar = pChar === 'naveen' ? 'ravi' : 'naveen';
    setOpponentChar(oChar);
    
    const p1 = new Fighter(100, CHARACTERS[pChar], 'right');
    const p2 = new Fighter(CANVAS_WIDTH - 160, CHARACTERS[oChar], 'left');
    
    fightersRef.current = { p1, p2 };
    aiRef.current = new AIController(p2, p1);
    
    setWinner(null);
    setGameState('FIGHT');
    sounds.init();
    sounds.startMusic();
  };

  useEffect(() => {
    if (gameState !== 'FIGHT') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      const { p1, p2 } = fightersRef.current!;
      
      // Player Input
      let moveDir = 0;
      if (keys.current.has('a')) moveDir = -1;
      if (keys.current.has('d')) moveDir = 1;
      p1.move(moveDir);

      if (keys.current.has('w')) p1.jump();
      if (keys.current.has('s')) p1.block(true);
      else p1.block(false);

      if (keys.current.has('j')) p1.punch();
      if (keys.current.has('k')) p1.kick();
      if (keys.current.has('l')) p1.specialMove();

      // AI Logic
      aiRef.current?.update();

      // Update Physics
      p1.update(p2.x);
      p2.update(p1.x);

      // Collision Detection (Hitboxes)
      checkHit(p1, p2);
      checkHit(p2, p1);

      // Check Win Condition
      if (p1.health <= 0 || p2.health <= 0) {
        setWinner(p1.health <= 0 ? p2.config.name : p1.config.name);
        setGameState('GAME_OVER');
      }

      setHudState({
        p1H: (p1.health / p1.maxHealth) * 100,
        p2H: (p2.health / p2.maxHealth) * 100,
        p1S: p1.specialPower,
        p2S: p2.specialPower,
      });
    };

    const sparks: { x: number, y: number, life: number }[] = [];

    const checkHit = (attacker: Fighter, defender: Fighter) => {
      if (attacker.attackHitbox && !attacker.hasHitInCurrentState) {
        const ah = attacker.attackHitbox;
        if (
          ah.x < defender.x + defender.width &&
          ah.x + ah.width > defender.x &&
          ah.y < defender.y + defender.height &&
          ah.y + ah.height > defender.y
        ) {
          const damage = attacker.state === FighterState.SPECIAL ? 30 : attacker.config.strength * (attacker.state === FighterState.KICK ? 1.2 : 0.8);
          defender.takeDamage(damage, 10);
          attacker.hasHitInCurrentState = true;
          attacker.specialPower = Math.min(100, attacker.specialPower + 10);
          sounds.playHit();
          if (attacker.state === FighterState.SPECIAL) sounds.playSpecial();
          
          // Visual Hit Effect
          for (let i = 0; i < 5; i++) {
             sparks.push({ 
               x: ah.x + ah.width / 2, 
               y: ah.y + ah.height / 2, 
               life: 10 + Math.random() * 10 
             });
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background (Beautiful Zen Temple Garden)
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#2c3e50');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Abstract Garden Elements (pagoda silhouette, cherry blossoms feel)
      ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
      for(let i=0; i<20; i++) {
         ctx.beginPath();
         ctx.arc((i * 50 + Date.now() * 0.02) % CANVAS_WIDTH, 100 + Math.sin(i) * 50, 2, 0, Math.PI * 2);
         ctx.fill();
      }

      // Distant Pagoda
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(CANVAS_WIDTH/2 - 40, GROUND_Y - 200, 80, 200);
      ctx.fillRect(CANVAS_WIDTH/2 - 60, GROUND_Y - 180, 120, 10);
      ctx.fillRect(CANVAS_WIDTH/2 - 50, GROUND_Y - 140, 100, 10);

      // Ground
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, GROUND_Y, CANVAS_WIDTH, 4);

      // Draw Sparks
      ctx.fillStyle = '#ffffff';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
        s.life--;
        s.x += (Math.random() - 0.5) * 4;
        s.y += (Math.random() - 0.5) * 4;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      // Draw Fighters
      fightersRef.current?.p1.draw(ctx);
      fightersRef.current?.p2.draw(ctx);
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 font-sans text-white overflow-hidden p-4">
      {/* HUD Layer */}
      <AnimatePresence>
        {gameState === 'FIGHT' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-0 left-0 w-full p-4 flex flex-col gap-2 z-20"
          >
            <div className="flex justify-between items-center max-w-4xl mx-auto w-full px-8">
              {/* P1 HUD */}
              <div className="flex flex-col grow max-w-[40%]">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-black uppercase tracking-tighter italic text-cyan-400">Naveen</span>
                  <span className="text-xs opacity-50">HP</span>
                </div>
                <div className="h-4 bg-neutral-800 rounded-sm overflow-hidden border border-neutral-700">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-red-600 to-yellow-500"
                    animate={{ width: `${hudState.p1H}%` }}
                  />
                </div>
                <div className="mt-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden w-1/2">
                   <motion.div className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" animate={{ width: `${hudState.p1S}%` }} />
                </div>
              </div>

              {/* Round Info */}
              <div className="flex flex-col items-center mx-4">
                <div className="text-xs uppercase tracking-[0.2em] opacity-50 mb-1">Round</div>
                <div className="text-3xl font-black italic">{round}</div>
              </div>

              {/* P2 HUD */}
              <div className="flex flex-col grow max-w-[40%] text-right">
                <div className="flex justify-between mb-1">
                  <span className="text-xs opacity-50">HP</span>
                  <span className="text-sm font-black uppercase tracking-tighter italic text-magenta-500" style={{ color: '#FF00FF' }}>Ravi</span>
                </div>
                <div className="h-4 bg-neutral-800 rounded-sm overflow-hidden border border-neutral-700">
                  <motion.div 
                    className="h-full bg-gradient-to-l from-red-600 to-yellow-500"
                    animate={{ width: `${hudState.p2H}%` }}
                  />
                </div>
                <div className="mt-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden w-1/2 ml-auto">
                   <motion.div className="h-full bg-magenta-500 shadow-[0_0_8px_#FF00FF]" animate={{ width: `${hudState.p2S}%` }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Screen */}
      <div className="relative border-4 border-neutral-800 rounded-xl shadow-2xl overflow-hidden bg-black aspect-video max-w-5xl w-full">
         <canvas 
           ref={canvasRef} 
           width={CANVAS_WIDTH} 
           height={CANVAS_HEIGHT}
           className="w-full h-full block"
         />

         {/* Menu Overlay */}
         <AnimatePresence>
            {gameState === 'MENU' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 z-30"
              >
                <div className="text-center mb-12">
                   <motion.h1 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-7xl font-black italic uppercase tracking-tighter mb-2 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent font-display"
                   >
                     Shadow Strike
                   </motion.h1>
                   <p className="text-sm uppercase tracking-[0.4em] text-cyan-400 font-display">Battle of Shadows</p>
                </div>

                <div className="flex gap-8">
                   {Object.entries(CHARACTERS).map(([key, char]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startGame(key)}
                        className="group relative w-48 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center transition-all hover:border-cyan-500/50"
                      >
                         <div 
                           className="w-24 h-24 mb-4 rounded-full flex items-center justify-center"
                           style={{ backgroundColor: `${char.color}22`, border: `2px solid ${char.color}` }}
                          >
                            <Sword className="w-10 h-10" style={{ color: char.color }} />
                          </div>
                          <span className="text-xl font-black uppercase italic" style={{ color: char.color }}>{char.name}</span>
                          <span className="text-[10px] uppercase tracking-widest opacity-40 mt-2">{key === 'naveen' ? 'Agile / Speed' : 'Strong / Power'}</span>
                          
                          {/* Details on hover */}
                          <div className="absolute inset-x-0 -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 p-2 rounded-lg text-[8px] text-center">
                             {key === 'naveen' ? 'Fast combos + Jump' : 'High Damage + Heavy hits'}
                          </div>
                      </motion.button>
                   ))}
                </div>

                <div className="mt-16 flex flex-col items-center gap-2 opacity-50">
                    <p className="text-[10px] uppercase tracking-widest">Controls</p>
                    <div className="flex gap-8 text-[10px] font-mono">
                       <span>[A/D] Move</span>
                       <span>[W] Jump</span>
                       <span>[S] Block</span>
                       <span>[J/K] Punch/Kick</span>
                       <span>[L] SPECIAL</span>
                    </div>
                </div>
              </motion.div>
            )}

            {gameState === 'GAME_OVER' && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 z-40"
               >
                  <Trophy className="w-20 h-20 text-yellow-500 mb-4 animate-bounce" />
                  <h2 className="text-5xl font-black uppercase italic mb-2 tracking-tighter font-display">
                    {winner} Wins
                  </h2>
                  <p className="text-xs uppercase tracking-[0.5em] opacity-50 mb-10 font-display">BATTLE_CONCLUDED</p>
                  
                  <div className="flex gap-4">
                     <button 
                       onClick={() => startGame(playerChar)}
                       className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black uppercase italic rounded-lg hover:bg-cyan-400 transition-colors"
                     >
                        <RefreshCcw className="w-4 h-4" /> Rematch
                     </button>
                     <button 
                       onClick={() => setGameState('MENU')}
                       className="flex items-center gap-2 px-8 py-3 bg-neutral-800 text-white font-black uppercase italic rounded-lg hover:bg-neutral-700 transition-colors"
                     >
                        <Home className="w-4 h-4" /> Menu
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      <div className="mt-8 text-neutral-600 text-[10px] uppercase tracking-widest flex items-center gap-2">
         <Zap className="w-3 h-3 text-yellow-500" />
         Naveen vs Ravi: The Shadow Conflict
      </div>
    </div>
  );
}
