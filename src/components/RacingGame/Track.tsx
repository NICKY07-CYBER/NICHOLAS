import React, { useRef } from 'react';
import { usePlane, useBox } from '@react-three/cannon';
import { Text, Float } from '@react-three/drei';
import { useRacingStore } from '../../hooks/useRacingStore';

export const Track = () => {
  const { completeLap, currentLapTime } = useRacingStore();
  const lastTriggerTime = useRef(0);

  // Ground plane (Visual infinite darkness)
  const [floor] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -1, 0],
    type: 'Static',
  }));

  // Initial Platform
  const [startPlatform] = useBox(() => ({
    args: [30, 1, 30],
    position: [0, -0.5, 0],
    type: 'Static',
  }));

  // Finish Line Sensor
  const [finishLine] = useBox(() => ({
    args: [30, 10, 2],
    position: [0, 5, 0],
    isSensor: true,
    onCollide: (e) => {
      // Prevent double triggers (only allow after 5 seconds of racing)
      if (currentLapTime > 5) {
        completeLap();
      }
    }
  }));

  return (
    <group>
      <mesh ref={floor}>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color="#222" metalness={0.1} roughness={0.8} />
      </mesh>
      <gridHelper args={[5000, 100, 0xff0000, 0x444444]} rotation={[-Math.PI/2, 0, 0]} position={[0, -0.99, 0]} />

      <mesh ref={startPlatform}>
        <boxGeometry args={[40, 1, 60]} />
        <meshStandardMaterial color="#333" roughness={0.6} metalness={0.2} />
        <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
          <Text
            position={[0, 8, -25]}
            fontSize={5}
            color="#ffffff"
            font="/fonts/Inter-Bold.woff"
          >
            TECH CITY
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
          </Text>
        </Float>
      </mesh>

      {/* Finish Line Visual */}
      <group position={[0, 0, 0]}>
        <mesh ref={finishLine} visible={false}>
          <boxGeometry args={[40, 10, 2]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[40, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
        </mesh>
        {/* Support Arches */}
        <CityGate position={[0, 0, 0]} color="#ffffff" />
      </group>

      {/* Futuristic Tracks */}
      <TrackSegment position={[0, 0, -40]} args={[12, 0.5, 60]} />
      <TrackSegment position={[10, 0, -100]} rotation={[0, 0.4, 0]} args={[12, 0.5, 80]} />
      <TrackSegment position={[40, 2, -160]} rotation={[0.1, 0.8, 0]} args={[12, 0.5, 100]} />
      <TrackSegment position={[100, 10, -200]} rotation={[0, 1.57, 0]} args={[140, 0.5, 12]} />
      
      {/* Urban Gates */}
      <CityGate position={[0, 0, -30]} color="#ffffff" />
      <CityGate position={[10, 0, -80]} rotation={[0, 0.4, 0]} color="#ffffff" />
      <CityGate position={[40, 2, -140]} rotation={[0.1, 0.8, 0]} color="#ffffff" />
      <CityGate position={[80, 10, -205]} rotation={[0, 1.57, 0]} color="#ffffff" />

      {/* Distant Skyscrapers (Glass blocks) */}
      {[...Array(60)].map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 800, (Math.random() * 50), -300 - Math.random() * 600]} receiveShadow castShadow>
          <boxGeometry args={[15 + Math.random() * 25, 40 + Math.random() * 200, 15 + Math.random() * 25]} />
          <meshPhysicalMaterial 
            color="#aaa" 
            metalness={1} 
            roughness={0.05} 
            transparent 
            opacity={0.9}
            envMapIntensity={2}
          />
          {/* Internal Structure / Glow */}
          <mesh position={[0, 0, 0]} scale={[0.9, 1, 0.9]}>
             <boxGeometry args={[15 + Math.random() * 25, 40 + Math.random() * 200, 15 + Math.random() * 25]} />
             <meshStandardMaterial color="#222" />
          </mesh>
        </mesh>
      ))}

      <fog attach="fog" args={['#ffffff', 100, 1000]} />
    </group>
  );
};

const TrackSegment = ({ position, rotation = [0, 0, 0], args }: any) => {
  const [ref] = useBox(() => ({
    type: 'Static',
    args,
    position,
    rotation,
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#222" roughness={0.8} metalness={0.2} />
      
      {/* Road Center Line (White/Yellow) */}
      <mesh position={[0, 0.26, 0]}>
        <planeGeometry args={[0.3, args[2]]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Side Barriers */}
      <mesh position={[args[0]/2 - 0.2, 0.4, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, args[2]]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-args[0]/2 + 0.2, 0.4, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, args[2]]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </mesh>
  );
};

const CityGate = ({ position, rotation = [0, 0, 0], color }: any) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 10, 0]} castShadow>
        <boxGeometry args={[25, 1, 2]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
      <mesh position={[12, 5, 0]} castShadow>
        <boxGeometry args={[1, 10, 2]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
      <mesh position={[-12, 5, 0]} castShadow>
        <boxGeometry args={[1, 10, 2]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
    </group>
  );
}
