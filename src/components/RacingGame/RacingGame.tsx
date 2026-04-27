import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, Sky, ContactShadows } from '@react-three/drei';
import { Vehicle } from './Vehicle';
import { Track } from './Track';
import { EngineSound } from '../EngineSound';
import { BackgroundMusic } from '../BackgroundMusic';
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
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 55 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset="city" />
          
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
          <EngineSound />
          <BackgroundMusic />
          
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[50, 50, 50]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          <ContactShadows resolution={1024} scale={200} blur={2} opacity={0.35} far={10} color="#000000" />
        </Suspense>
      </Canvas>

      {/* OVERLAY HUD - MINIMAL TECH */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter text-white opacity-90">
              METROPOLIS_<span className="text-red-600">DRIVE</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="h-[2px] w-12 bg-red-600" />
              <p className="text-[9px] text-white/50 uppercase tracking-[0.4em] font-medium">Urban Environment v1.0.4</p>
            </div>
          </div>
          
          <div className="bg-white/5 border-l-2 border-red-600 p-4 backdrop-blur-md flex flex-col gap-1 items-end min-w-[200px]">
             <div className="flex justify-between w-full items-baseline">
               <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Time</span>
               <span className="text-xl text-white font-mono font-bold">{formatTime(currentLapTime)}</span>
             </div>
             {bestLapTime > 0 && (
               <div className="flex justify-between w-full items-baseline border-t border-white/10 mt-1 pt-1">
                 <span className="text-[9px] text-red-500/80 font-bold uppercase">Best</span>
                 <span className="text-sm text-white/80 font-mono italic">{formatTime(bestLapTime)}</span>
               </div>
             )}
          </div>
        </div>

        {/* Bottom HUD - Floating Speedometer */}
        <div className="flex justify-center items-end pb-4">
          <div className="flex flex-col items-center">
            <div className={`transition-all duration-300 ${isNitroActive ? 'scale-110 blur-[1px]' : 'scale-100'}`}>
              <div className="relative flex flex-col items-center">
                <span className="text-9xl font-black text-white tracking-tighter">
                  {speed.toString().padStart(3, '0')}
                </span>
                <span className="text-xl font-bold text-red-600 -mt-6 tracking-[0.5em] ml-4">KM/H</span>
              </div>
            </div>
            
            {/* Speed Bar */}
            <div className="mt-2 flex gap-[2px]">
               {[...Array(40)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`h-6 w-[2px] ${i < (speed / 7.5) ? 'bg-red-600' : 'bg-white/10'}`} 
                 />
               ))}
            </div>

            {/* Nitro Gauge */}
            <div className="mt-4 w-64 h-1 bg-white/10 relative">
               <div 
                 className="h-full bg-blue-500 transition-all duration-75" 
                 style={{ width: `${nitro}%` }}
               />
               <div className="absolute -top-4 left-0 text-[8px] text-white/30 uppercase tracking-widest">Nitro_Reserve</div>
            </div>
          </div>
        </div>

        {/* Replay Button if available */}
        {recording.length > 0 && (
          <div className="absolute bottom-8 right-8">
            <button 
              onClick={() => setReplaying(!isReplaying)}
              className={`pointer-events-auto px-4 py-2 text-[10px] uppercase font-bold tracking-widest border border-white/20 transition-all ${isReplaying ? 'bg-red-600 text-white' : 'bg-black/40 text-white/60 hover:bg-white/10'}`}
            >
              {isReplaying ? 'Live_Feed' : 'Last_Run_Data'}
            </button>
          </div>
        )}
      </div>
      
      {/* Nitro Flash Overlay */}
      {isNitroActive && (
        <div className="absolute inset-0 pointer-events-none border-[60px] border-cyan-500/10 blur-3xl animate-pulse mix-blend-screen" />
      )}
    </div>
  );
}
