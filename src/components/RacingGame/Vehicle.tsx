import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useRaycastVehicle } from '@react-three/cannon';
import { useControls } from '../../hooks/useControls';
import { useRacingStore } from '../../hooks/useRacingStore';
import * as THREE from 'three';

const chassisWidth = 1.2;
const chassisHeight = 0.6;
const chassisLength = 2.4;
const wheelRadius = 0.35;

const PARTICLE_COUNT = 30;

export const Vehicle = ({ position = [0, 5, 0] }: { position?: [number, number, number] }) => {
  const controls = useControls();
  const [velocity, setVelocity] = useState([0, 0, 0]);
  const { nitro, setNitro, setSpeed, setIsNitroActive, resetRace, isReplaying, isNitroActive } = useRacingStore();

  const [chassis, chassisApi] = useBox(
    () => ({
      allowSleep: false,
      args: [chassisWidth, chassisHeight, chassisLength],
      mass: 1200,
      position,
      onCollide: (e) => {
        if (!e.contact || !e.contact.contactPoint) return;
        // Trigger impact sparks
        for (let i = 0; i < 5; i++) {
          const deadParticle = particles.find(p => p.life <= 0);
          if (deadParticle) {
            deadParticle.pos.set(
              e.contact.contactPoint[0] || 0, 
              e.contact.contactPoint[1] || 0, 
              e.contact.contactPoint[2] || 0
            );
            deadParticle.life = 0.5;
            deadParticle.speed.set((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2);
          }
        }
      }
    }),
    useRef<THREE.Mesh>(null!)
  );

  // Particles for smoke/heat/nitro
  const particles = useMemo(() => {
    const p = new Array(PARTICLE_COUNT).fill(0).map(() => ({
      pos: new THREE.Vector3(),
      life: 0,
      speed: new THREE.Vector3(),
      type: 'smoke' as 'smoke' | 'spark' | 'nitro',
    }));
    return p;
  }, []);

  const particleRefs = useRef<THREE.Group>(null!);

  const wheelRefs = [
    useRef<THREE.Group>(null!), 
    useRef<THREE.Group>(null!), 
    useRef<THREE.Group>(null!), 
    useRef<THREE.Group>(null!)
  ];

  const wheelInfoCommon = {
    radius: wheelRadius,
    directionLocal: [0, -1, 0] as [number, number, number],
    axleLocal: [-1, 0, 0] as [number, number, number],
    suspensionStiffness: 40,
    suspensionRestLength: 0.3,
    frictionSlip: 3.5, // Buffed grip for arcade feel
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence: 0.01,
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
  };

  const wheelInfos: any[] = [
    { ...wheelInfoCommon, isFrontWheel: true, chassisConnectionPointLocal: [-chassisWidth / 2, 0, chassisLength / 2] as [number, number, number] },
    { ...wheelInfoCommon, isFrontWheel: true, chassisConnectionPointLocal: [chassisWidth / 2, 0, chassisLength / 2] as [number, number, number] },
    { ...wheelInfoCommon, isFrontWheel: false, chassisConnectionPointLocal: [-chassisWidth / 2, 0, -chassisLength / 2] as [number, number, number] },
    { ...wheelInfoCommon, isFrontWheel: false, chassisConnectionPointLocal: [chassisWidth / 2, 0, -chassisLength / 2] as [number, number, number] },
  ];

  const [vehicle, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody: chassis,
    wheels: wheelRefs,
    wheelInfos,
  }));

  useEffect(() => {
    if (!chassisApi || !chassisApi.velocity) return;
    try {
      const unsub = chassisApi.velocity.subscribe(v => {
        if (v) setVelocity(v);
      });
      return () => unsub();
    } catch (e) {
      console.error("Velocity subscription failed", e);
    }
  }, [chassisApi]);

  const thrusterRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    if (!vehicleApi || !chassisApi || isReplaying) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { forward, backward, left, right, brake, nitro: nitroKey, reset } = controls;
    
    const currentVel = velocity || [0, 0, 0];
    const sMs = Math.sqrt((currentVel[0]||0)**2 + (currentVel[1]||0)**2 + (currentVel[2]||0)**2);
    const speedKmh = Math.floor(sMs * 3.6);
    setSpeed(speedKmh);

    // Update thruster visual directly for performance
    if (thrusterRef.current) {
      const mat = thrusterRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.9, sMs / 15);
      mat.color.set(isNitroActive ? "#ff00ff" : "#00f2ff");
    }

    // Nitro Logic
    const useNitro = nitroKey && nitro > 0 && speedKmh > 10;
    setIsNitroActive(useNitro);
    if (useNitro) {
      setNitro(Math.max(0, nitro - delta * 30));
    } else {
      // Slow recharge, faster if drifting
      const driftIntensity = (left || right || brake) ? 1 : 0;
      setNitro(Math.min(100, nitro + delta * (speedKmh > 40 ? 5 + driftIntensity * 10 : 5)));
    }

    const forceBase = 3200;
    const force = useNitro ? forceBase * 2.8 : forceBase;
    const steer = 0.45;

    try {
      // Engine/Brakes safety
      if (vehicleApi.applyEngineForce) {
        if (forward) {
          vehicleApi.applyEngineForce(-force, 2);
          vehicleApi.applyEngineForce(-force, 3);
        } else if (backward) {
          vehicleApi.applyEngineForce(force, 2);
          vehicleApi.applyEngineForce(force, 3);
        } else {
          vehicleApi.applyEngineForce(0, 2);
          vehicleApi.applyEngineForce(0, 3);
        }
      }
      
      if (vehicleApi.setSteeringValue) {
        vehicleApi.setSteeringValue(left ? steer : right ? -steer : 0, 0);
        vehicleApi.setSteeringValue(left ? steer : right ? -steer : 0, 1);
      }

      const bForce = brake ? 1500 : 0; // Much stronger brakes
      if (vehicleApi.setBrake) {
        vehicleApi.setBrake(bForce, 2);
        vehicleApi.setBrake(bForce, 3);
        if (speedKmh > 20) {
           vehicleApi.setBrake(bForce / 2, 0);
           vehicleApi.setBrake(bForce / 2, 1);
        }
      }

      if (reset) {
        chassisApi.position?.set(0, 5, 0);
        chassisApi.velocity?.set(0, 0, 0);
        chassisApi.rotation?.set(0, 0, 0);
        chassisApi.angularVelocity?.set(0, 0, 0);
        resetRace();
      }

      // Particle Logic
      const isDrifting = speedKmh > 40 && (left || right || brake);
      
      // Nitro particles
      if (useNitro && Math.random() > 0.3) {
        const p = particles.find(p => p.life <= 0);
        if (p && vehicle.current) {
          p.type = 'nitro';
          p.pos.setFromMatrixPosition(chassis.current.matrixWorld);
          p.life = 0.6;
          p.speed.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0.4);
          p.speed.applyQuaternion(chassis.current.quaternion);
        }
      }

      // Drift smoke
      if (isDrifting && Math.random() > 0.4) {
        const p = particles.find(p => p.life <= 0);
        if (p && wheelRefs[2].current) {
          p.type = 'smoke';
          p.pos.setFromMatrixPosition(wheelRefs[Math.random() > 0.5 ? 2 : 3].current.matrixWorld);
          p.life = 1.0;
          p.speed.set((Math.random() - 0.5) * 0.2, Math.random() * 0.4, (Math.random() - 0.5) * 0.2);
        }
      }

      // Update particles
      if (particleRefs.current && particleRefs.current.children && particles) {
        particleRefs.current.children.forEach((mesh, i) => {
          const p = particles[i];
          if (p && p.life > 0 && mesh && mesh.position) {
            p.pos.add(p.speed);
            p.life -= delta * (p.type === 'nitro' ? 2 : 1);
            mesh.position.copy(p.pos);
            mesh.scale.setScalar(p.life * (p.type === 'nitro' ? 1.5 : 1));
            mesh.visible = true;
            
            const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (p.type === 'nitro') {
               mat.color.set(0x00f2ff);
               mat.opacity = p.life * 0.8;
            } else if (p.type === 'smoke') {
               mat.color.set(0xffffff);
               mat.opacity = p.life * 0.3;
            } else {
               mat.color.set(0xff4400);
               mat.opacity = p.life;
            }
          } else if (mesh) {
            mesh.visible = false;
          }
        });
      }

    } catch (e) {
      // Catch-all for initialization race conditions
    }
  });

  return (
    <group ref={vehicle}>
      <mesh ref={chassis} name="vehicle-chassis" castShadow>
        <boxGeometry args={[chassisWidth, chassisHeight, chassisLength]} />
        <meshPhysicalMaterial 
          color="#aa0000" 
          metalness={1} 
          roughness={0.1} 
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={2}
          reflectivity={1}
        />
        
        {/* Car Top / Cockpit */}
        <mesh position={[0, 0.45, -0.1]} castShadow>
          <boxGeometry args={[chassisWidth * 0.85, 0.4, chassisLength * 0.5]} />
          <meshPhysicalMaterial 
            color="#000033" 
            metalness={1} 
            roughness={0.05} 
            clearcoat={1}
            envMapIntensity={2}
          />
        </mesh>

        {/* Spoiler */}
        <mesh position={[0, 0.5, 1.1]} castShadow>
          <boxGeometry args={[chassisWidth * 1.1, 0.05, 0.3]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.5, 0.3, 1.1]}>
          <boxGeometry args={[0.05, 0.4, 0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.5, 0.3, 1.1]}>
          <boxGeometry args={[0.05, 0.4, 0.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>

        {/* Headlights */}
        <mesh position={[-0.45, 0, -1.2]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
          <pointLight intensity={2} distance={10} color="#ffffff" />
        </mesh>
        <mesh position={[0.45, 0, -1.2]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
          <pointLight intensity={2} distance={10} color="#ffffff" />
        </mesh>

        {/* Tail Lights */}
        <mesh position={[-0.45, 0, 1.2]}>
          <boxGeometry args={[0.3, 0.05, 0.05]} />
          <meshBasicMaterial color="#ff0000" toneMapped={false} />
        </mesh>
        <mesh position={[0.45, 0, 1.2]}>
          <boxGeometry args={[0.3, 0.05, 0.05]} />
          <meshBasicMaterial color="#ff0000" toneMapped={false} />
        </mesh>

        {/* Blue/Red Chameleon Accents */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[chassisWidth + 0.02, 0.1, chassisLength]} />
          <meshStandardMaterial color="#0066ff" metalness={1} roughness={0.1} />
        </mesh>
        
        {/* Neon Underglow */}
        <mesh position={[0, -chassisHeight/2, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[chassisWidth * 1.2, chassisLength * 0.8]} />
          <meshBasicMaterial color="#ff0044" transparent opacity={0.2} />
        </mesh>
        
        {/* Rear thruster glow (Nitro/Exhaust) */}
        <mesh position={[0, -0.1, 1.25]} ref={thrusterRef}>
          <boxGeometry args={[0.5, 0.15, 0.1]} />
          <meshBasicMaterial 
            color="#00f2ff" 
            transparent 
            opacity={0} 
            toneMapped={false}
          />
        </mesh>
      </mesh>

      {wheelRefs.map((ref, i) => (
        <group ref={ref} key={i}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.25, 24]} />
            <meshStandardMaterial color="#111" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius * 0.8, wheelRadius * 0.8, 0.26, 12]} />
            <meshStandardMaterial color="#666" metalness={1} roughness={0.2} wireframe />
          </mesh>
        </group>
      ))}

      <group ref={particleRefs}>
        {particles.map((_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color="white" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
