import { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, RefreshCcw, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;

export default function SnakeGame() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food spawned on snake
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setIsGameOver(false);
    setScore(0);
    setIsPaused(false);
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          if (isPaused) setIsPaused(false);
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          if (isPaused) setIsPaused(false);
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          if (isPaused) setIsPaused(false);
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          if (isPaused) setIsPaused(false);
          break;
        case ' ':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    const speed = Math.max(60, BASE_SPEED - Math.floor(score / 50) * 5);
    gameLoopRef.current = setInterval(moveSnake, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveSnake, score]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // Draw logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear board
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid pattern (matching the theme's background)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        ctx.beginPath();
        ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = '#00FF9F';
      ctx.shadowBlur = index === 0 ? 15 : 2;
      ctx.shadowColor = '#00FF9F';
      
      const padding = index === 0 ? 1 : 2;
      ctx.fillRect(
        segment.x * cellSize + padding,
        segment.y * cellSize + padding,
        cellSize - padding * 2,
        cellSize - padding * 2
      );

      // Snake eye for head
      if (index === 0) {
        ctx.fillStyle = 'black';
        ctx.shadowBlur = 0;
        ctx.fillRect(
          segment.x * cellSize + cellSize * 0.6,
          segment.y * cellSize + cellSize * 0.2,
          cellSize * 0.2,
          cellSize * 0.2
        );
      }
      ctx.shadowBlur = 0;
    });

    // Draw food
    ctx.fillStyle = '#FF00E5';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF00E5';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [snake, food]);

  return (
    <div ref={containerRef} className={`flex flex-col items-center ${isFullscreen ? 'bg-cyber-dark fixed inset-0 z-50 justify-center p-8' : ''}`}>
      {/* Score Portal - using ReactDOM.createPortal would be cleaner but let's just keep it here as absolute or similar if needed, 
          but the design wants it in header. I'll pass it up or use a simple shared state if this was more complex. 
          For now, I'll put it in a fixed-top-right area that matches the design header space. */}
      {/* Note: In App.tsx I left a div for this. Let's just render the scores in a way that matches the theme's positioning. */}
      <div className={`${isFullscreen ? 'absolute top-10 right-10' : 'fixed top-6 right-20'} flex gap-12 z-20`}>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Current Score</p>
          <p className="text-4xl font-mono leading-none text-accent-pink shadow-text-pink">{score.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">High Score</p>
          <p className="text-4xl font-mono leading-none">{highScore.toLocaleString()}</p>
        </div>
      </div>

      <div className="relative p-2 border border-white/20 bg-black shadow-2xl">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="relative bg-cyber-grid"
        />

        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
            >
              <h2 className="text-4xl font-black tracking-tighter text-accent-pink mb-2">SYSTEM_CRASH</h2>
              <p className="text-white/40 font-mono text-[10px] mb-8 tracking-[0.3em]">RECONSTRUCTION_FAILED</p>
              <button
                onClick={resetGame}
                className="flex items-center gap-3 px-8 py-3 bg-primary text-black font-black hover:scale-105 transition-transform shadow-neon-green"
              >
                <RefreshCcw className="w-5 h-5" />
                INITIATE_REBOOT
              </button>
            </motion.div>
          )}

          {isPaused && !isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs font-bold text-white tracking-[0.5em] uppercase border border-white/20 px-6 py-2 bg-black/50"
              >
                Link Protocol Ready
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-4 left-4">
          <p className="text-[10px] font-mono text-white/30 tracking-widest">SYSTEM.READY_V4.2</p>
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all rounded"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-8 flex gap-6 text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">
        <span className="flex items-center gap-1 group transition-colors hover:text-white cursor-help">
          <span className="text-primary opacity-50 group-hover:opacity-100">&uarr;</span> Up
        </span>
        <span className="flex items-center gap-1 group transition-colors hover:text-white cursor-help">
          <span className="text-primary opacity-50 group-hover:opacity-100">&darr;</span> Down
        </span>
        <span className="flex items-center gap-1 group transition-colors hover:text-white cursor-help">
          <span className="text-primary opacity-50 group-hover:opacity-100">&larr;</span> Left
        </span>
        <span className="flex items-center gap-1 group transition-colors hover:text-white cursor-help">
          <span className="text-primary opacity-50 group-hover:opacity-100">&rarr;</span> Right
        </span>
      </div>
    </div>
  );
}
