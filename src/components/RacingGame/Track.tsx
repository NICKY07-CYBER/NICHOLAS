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
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#020202" metalness={1} roughness={0.5} />
      </mesh>

      <mesh ref={startPlatform}>
        <boxGeometry args={[30, 1, 30]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 4, -10]}
            fontSize={2.5}
            color="#00f2ff"
            font="/fonts/Inter-Bold.woff" // fallback
          >
            NEON ASPHALT
            <meshBasicMaterial color="#00f2ff" toneMapped={false} />
          </Text>
        </Float>
      </mesh>

      {/* Finish Line Visual */}
      <group position={[0, 0, 0]}>
        <mesh ref={finishLine} visible={false}>
          <boxGeometry args={[30, 10, 2]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 4]} />
          <meshBasicMaterial color="#00f2ff" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[31, 10, 0.2]} />
          <meshBasicMaterial color="#00f2ff" wireframe transparent opacity={0.1} />
        </mesh>
        {/* Luminous Start Gate */}
        <NeonArch position={[0, 0, 1.5]} color="#00f2ff" />
      </group>

      {/* Futuristic Tracks */}
      <TrackSegment position={[0, 0, -40]} args={[12, 0.5, 60]} />
      <TrackSegment position={[10, 0, -100]} rotation={[0, 0.4, 0]} args={[12, 0.5, 80]} />
      <TrackSegment position={[40, 2, -160]} rotation={[0.1, 0.8, 0]} args={[12, 0.5, 100]} />
      <TrackSegment position={[100, 10, -200]} rotation={[0, 1.57, 0]} args={[140, 0.5, 12]} />
      
      {/* Neon Archways */}
      <NeonArch position={[0, 0, -30]} color="#00f2ff" />
      <NeonArch position={[10, 0, -80]} rotation={[0, 0.4, 0]} color="#f0f" />
      <NeonArch position={[40, 2, -140]} rotation={[0.1, 0.8, 0]} color="#0f0" />
      <NeonArch position={[80, 10, -205]} rotation={[0, 1.57, 0]} color="#ff0" />

      {/* Distant Skyscrapers (Neon cubes) */}
      {[...Array(30)].map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 500, (Math.random() * 100), -200 - Math.random() * 300]}>
          <boxGeometry args={[10 + Math.random() * 20, 50 + Math.random() * 150, 10 + Math.random() * 20]} />
          <meshStandardMaterial color="#050505" />
          {/* Windows/Glow */}
          <mesh position={[0, 0, 0]} scale={[1.01, 1.01, 1.01]}>
             <boxGeometry args={[11 + Math.random() * 20, 51 + Math.random() * 150, 11 + Math.random() * 20]} />
             <meshBasicMaterial color={['#00f2ff', '#f0f', '#0f0'][i % 3]} wireframe opacity={0.1} transparent />
          </mesh>
        </mesh>
      ))}

      <fog attach="fog" args={['#030305', 50, 400]} />
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
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#080808" roughness={0.1} metalness={1} />
      
      {/* Road Center Line */}
      <mesh position={[0, 0.26, 0]}>
        <planeGeometry args={[0.2, args[2]]} />
        <meshBasicMaterial color="#00f2ff" toneMapped={false} />
      </mesh>

      {/* Luminous Curbs */}
      <mesh position={[args[0]/2 - 0.1, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.4, args[2]]} />
        <meshBasicMaterial color="#f0f" toneMapped={false} />
      </mesh>
      <mesh position={[-args[0]/2 + 0.1, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.4, args[2]]} />
        <meshBasicMaterial color="#f0f" toneMapped={false} />
      </mesh>
    </mesh>
  );
};

const NeonArch = ({ position, rotation = [0, 0, 0], color }: any) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[20, 0.5, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[10, 4, 0]}>
        <boxGeometry args={[0.5, 8, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[-10, 4, 0]}>
        <boxGeometry args={[0.5, 8, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
