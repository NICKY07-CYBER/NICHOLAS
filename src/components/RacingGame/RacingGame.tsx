import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Sky, Environment, Stars, OrbitControls } from '@react-three/drei';
import { Vehicle } from './Vehicle';
import { Track } from './Track';
import * as THREE from 'three';

export default function RacingGame() {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <Suspense fallback={null}>
          <Sky sunPosition={[100, 10, 100]} />
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

          <OrbitControls 
            makeDefault 
            maxPolarAngle={Math.PI / 2.1} 
            enableDamping
          />
        </Suspense>
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="flex justify-between items-start">
          <div className="font-mono text-white">
            <h1 className="text-4xl font-black italic tracking-tighter text-red-600">ABYSS DRIFT</h1>
            <p className="text-[10px] uppercase tracking-[0.4em] opacity-50">Experimental Sim V9.2</p>
          </div>
          <div className="bg-red-950/20 border border-red-900/50 p-4 backdrop-blur-md">
             <p className="text-[10px] text-red-500 uppercase font-black mb-2">Mechanical Health</p>
             <div className="w-48 h-1 bg-neutral-900 rounded-full overflow-hidden">
                <div className="w-[98%] h-full bg-red-600" />
             </div>
             <p className="text-[8px] text-white/30 mt-2">ENGINE_TEMP: 92°C | TIRE_WEAR: 2%</p>
          </div>
        </div>

        <div className="flex justify-end gap-12 items-end">
           <div className="text-right">
              <p className="text-[10px] uppercase text-white/40 tracking-widest">G-Force</p>
              <div className="w-24 h-24 border border-white/10 relative rounded-full flex items-center justify-center">
                 <div className="w-1 h-1 bg-red-500 rounded-full absolute" style={{ top: '45%', left: '48%' }} />
              </div>
           </div>
           <div className="text-right font-mono">
              <span className="text-8xl font-black italic shadow-2xl">084</span>
              <span className="text-2xl font-bold ml-2 text-red-600">KM/H</span>
           </div>
        </div>
      </div>

      {/* Pro-Tips / Controls */}
      <div className="absolute bottom-8 left-8 text-white/30 text-[8px] uppercase tracking-widest font-mono">
        [W/S] THRUST/REVERSE | [A/D] STEER | [SPACE] TUG_BRAKE | [R] RESET_DIMENSION
      </div>
    </div>
  );
}
