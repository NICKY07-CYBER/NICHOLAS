import React from 'react';
import { usePlane, useBox } from '@react-three/cannon';
import { Text } from '@react-three/drei';

export const Track = () => {
  // Ground plane (The death zone)
  const [floor] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -100, 0],
    type: 'Static',
  }));

  // Initial Platform
  const [startPlatform] = useBox(() => ({
    args: [20, 1, 20],
    position: [0, -0.5, 0],
    type: 'Static',
  }));

  // Brutalist Narrow Pillars & Turns
  return (
    <group>
      <mesh ref={floor}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#050505" transparent opacity={0.5} />
      </mesh>
      <mesh ref={startPlatform}>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="#333" roughness={1} />
        <Text
          position={[0, 0.6, 5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          color="white"
        >
          VERTICAL ABYSS - ASCEND
        </Text>
      </mesh>

      {/* Segment 1: Straight Climb */}
      <TrackSegment position={[0, 2, -30]} rotation={[0.1, 0, 0]} args={[6, 0.5, 40]} color="#111" />
      
      {/* Segment 2: Hairpin Turn (The Danger Zone) */}
      <TrackSegment position={[15, 6, -60]} rotation={[0, 1.5, 0]} args={[50, 0.5, 8]} color="#222" />
      
      {/* Segment 3: Sharp Chicane */}
      <TrackSegment position={[40, 10, -90]} rotation={[-0.1, 0, 0]} args={[6, 0.5, 60]} color="#111" />
      
      {/* Visual Decor: Brutalist Slabs and Scattered Debris */}
      <mesh position={[-20, 0, -50]}>
        <boxGeometry args={[2, 100, 2]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[20, 0, -100]}>
        <boxGeometry args={[2, 200, 2]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* Scattered Debris (Visual only) */}
      {[...Array(10)].map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 40, 0, -i * 20]}>
           <boxGeometry args={[0.5, 0.5, 0.5]} />
           <meshStandardMaterial color="#222" />
        </mesh>
      ))}

      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 20, 5]} intensity={1} castShadow />
      <fog attach="fog" args={['#000', 30, 200]} />
    </group>
  );
};

const TrackSegment = ({ position, rotation, args, color }: any) => {
  const [ref] = useBox(() => ({
    type: 'Static',
    args,
    position,
    rotation,
  }));

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.8} />
      {/* Visual curbs */}
      <mesh position={[args[0]/2 - 0.2, 0.3, 0]}>
        <boxGeometry args={[0.4, 0.2, args[2]]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <mesh position={[-args[0]/2 + 0.2, 0.3, 0]}>
        <boxGeometry args={[0.4, 0.2, args[2]]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </mesh>
  );
};
