import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, Stars } from '@react-three/drei';
import { Vehicle } from './Vehicle';
import { Track } from './Track';
import { useRacingStore } from '../../hooks/useRacingStore';
import * as THREE from 'three';

const FollowCamera = () => {
  const { camera } = useThree();
  const { isNitroActive, speed, updateTimer, isReplaying, recording, saveRecording, setReplaying, setSpeed, setIsNitroActive, currentLapTime, bestLapTime, lap, lastLapTime } = useRacingStore();
  const target = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const tempRecording = useRef<any[]>([]);
  const lastTime = useRef(0);

  // Save recording if best lap was just improved
  useEffect(() => {
    if (lastLapTime > 0 && lastLapTime <= bestLapTime) {
      saveRecording([...tempRecording.current]);
    }
    tempRecording.current = [];
  }, [lap]);

  useFrame((state, delta) => {
    if (!isReplaying) {
      updateTimer(delta);
    }
    
    const vehicle = state.scene.getObjectByName('vehicle-chassis');
    if (!vehicle) return;

    if (isReplaying && recording.length > 0) {
      // PLAYBACK LOGIC
      const time = state.clock.getElapsedTime() % (recording[recording.length-1].time - recording[0].time);
      const startTime = recording[0].time;
      const frameIndex = recording.findIndex(f => (f.time - startTime) > time);
      const frame = recording[frameIndex] || recording[recording.length - 1];
      
      if (frame) {
        vehicle.position.set(...frame.pos);
        vehicle.quaternion.set(...frame.rot);
        camera.position.set(...frame.camPos);
        setIsNitroActive(frame.isNitro);
        // Look at vehicle
        lookTarget.set(0, 1, -5).applyQuaternion(vehicle.quaternion).add(vehicle.position);
        camera.lookAt(lookTarget);
      }
      return;
    }

    // RECORDING LOGIC (only during active race)
    if (!isReplaying && state.clock.getElapsedTime() - lastTime.current > 0.03) {
      tempRecording.current.push({
        time: state.clock.getElapsedTime(),
        pos: vehicle.position.toArray(),
        rot: vehicle.quaternion.toArray(),
        camPos: camera.position.toArray(),
        isNitro: isNitroActive
      });
      lastTime.current = state.clock.getElapsedTime();
    }

    // NORMAL CAMERA LOGIC
    target.set(0, 4, 10);
    target.applyQuaternion(vehicle.quaternion);
    target.add(vehicle.position);
    camera.position.lerp(target, 0.1);

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const targetFov = isNitroActive ? 85 : 55 + (speed / 15);
    perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, targetFov, 0.05);
    perspectiveCamera.updateProjectionMatrix();

    lookTarget.set(0, 1, -5);
    lookTarget.applyQuaternion(vehicle.quaternion);
    lookTarget.add(vehicle.position);
    camera.lookAt(lookTarget);
  });

  return null;
};

export default function RacingGame() {
  const { speed, nitro, isNitroActive, lap, currentLapTime, lastLapTime, bestLapTime, isReplaying, recording, setReplaying } = useRacingStore();

  const formatTime = (time: number) => {
    if (time === 0) return "--:--:--";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full bg-black relative font-sans overflow-hidden">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 55 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#030305']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="night" />
          
          <Physics
            gravity={[0, -9.81, 0]}
            defaultContactMaterial={{
              friction: 0.9,
              restitution: 0.1,
            }}
          >
            <Vehicle />
            <Track />
          </Physics>

          <FollowCamera />
          
          <ambientLight intensity={0.4} />
          <spotLight position={[10, 20, 10]} angle={0.2} penumbra={1} intensity={1.5} castShadow />
        </Suspense>
      </Canvas>

      {/* OVERLAY HUD - NEON STYLE */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-10">
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              NEON ASPHALT
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 mt-1 shadow-[0_0_10px_#06b6d4]" />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-cyan-300 uppercase tracking-[0.6em] font-bold">Arcade Series / Night City</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] text-fuchsia-500 font-bold uppercase tracking-widest">Lap</span>
                <span className="text-2xl font-black italic text-white drop-shadow-[0_0_10px_#d946ef]">{lap}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {/* Timer HUD */}
            <div className="bg-black/80 border-l-4 border-fuchsia-600 p-4 backdrop-blur-xl flex flex-col gap-1 items-end min-w-[200px] mb-2 shadow-[0_0_30px_rgba(217,70,239,0.2)]">
               <div className="flex justify-between w-full items-baseline">
                 <span className="text-[10px] text-fuchsia-500 font-bold uppercase tracking-widest">Current Time</span>
                 <span className="text-xl text-white font-mono font-bold tracking-tighter">{formatTime(currentLapTime)}</span>
               </div>
               {lastLapTime > 0 && (
                 <div className="flex justify-between w-full items-baseline opacity-80">
                   <span className="text-[9px] text-cyan-400 font-bold uppercase">Last Lap</span>
                   <span className="text-sm text-cyan-100 font-mono italic">{formatTime(lastLapTime)}</span>
                 </div>
               )}
               {bestLapTime > 0 && (
                 <div className="flex justify-between w-full items-baseline">
                   <span className="text-[9px] text-yellow-400 font-bold uppercase">Best Lap</span>
                   <span className="text-sm text-yellow-100 font-mono font-bold tracking-tighter">{formatTime(bestLapTime)}</span>
                 </div>
               )}
            </div>

            <div className="bg-black/60 border-r-4 border-cyan-500 p-4 backdrop-blur-xl flex flex-col gap-1 items-end min-w-[240px]">
               <div className="flex justify-between w-full items-baseline">
                 <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Nitro System</span>
                 <span className="text-xs text-white font-mono">{Math.floor(nitro)}%</span>
               </div>
               <div className="w-full h-3 bg-neutral-900/80 rounded-sm overflow-hidden p-[2px] border border-cyan-500/30">
                 <div 
                   className="h-full transition-all duration-75 shadow-[0_0_20px_#22d3ee]" 
                   style={{ 
                     width: `${nitro}%`,
                     backgroundColor: isNitroActive ? '#22d3ee' : '#0891b2'
                   }} 
                 />
               </div>
               {isNitroActive && (
                 <div className="text-[9px] text-cyan-400 animate-pulse font-bold tracking-tighter uppercase">Nitro Active! High Speed Burn</div>
               )}
            </div>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-4">
            {recording.length > 0 && (
              <button 
                onClick={() => setReplaying(!isReplaying)}
                className={`pointer-events-auto px-6 py-3 border-2 font-black italic tracking-widest transition-all duration-300 transform -skew-x-12 cursor-pointer ${isReplaying ? 'bg-fuchsia-600 border-white text-white shadow-[0_0_20px_#d946ef]' : 'bg-black/60 border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black'}`}
              >
                {isReplaying ? 'EXIT REPLAY' : 'WATCH BEST LAP'}
              </button>
            )}
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full border-2 border-fuchsia-500/50 flex items-center justify-center bg-black/40 backdrop-blur-md">
                 <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-ping" />
              </div>
              <div className="text-fuchsia-400 font-mono">
                <p className="text-[10px] uppercase font-bold tracking-widest">GPS Status</p>
                <p className="text-xs">LOCKED_ON_DRIFT</p>
              </div>
            </div>
            <div className="text-white/30 text-[9px] uppercase tracking-[0.3em] font-mono bg-black/60 p-3 backdrop-blur-md border border-white/10">
               [W/S] Drive | [A/D] Drift | [L_SHIFT] Nitro | [SPACE] Brake | [R] Reset
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`transition-all duration-300 ${isNitroActive ? 'scale-110' : 'scale-100'}`}>
              <div className="relative">
                <span className="text-9xl font-black italic text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  {speed.toString().padStart(3, '0')}
                </span>
                <div className="absolute -bottom-2 right-0">
                  <span className="text-2xl font-black italic text-fuchsia-500 drop-shadow-[0_0_10px_#d946ef]">KM/H</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-1">
               {[...Array(20)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`h-4 w-1 transform -skew-x-12 ${i < (speed / 15) ? 'bg-cyan-500 shadow-[0_0_5px_#06b6d4]' : 'bg-neutral-800'}`} 
                 />
               ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Nitro Flash Overlay */}
      {isNitroActive && (
        <div className="absolute inset-0 pointer-events-none border-[60px] border-cyan-500/10 blur-3xl animate-pulse mix-blend-screen" />
      )}
    </div>
  );
}
