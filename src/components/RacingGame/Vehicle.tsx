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
  const { nitro, setNitro, setSpeed, setIsNitroActive, resetRace, isReplaying } = useRacingStore();

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

  useFrame((state, delta) => {
    if (!vehicleApi || !chassisApi || isReplaying) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { forward, backward, left, right, brake, nitro: nitroKey, reset } = controls;
    
    const currentVel = velocity || [0, 0, 0];
    const speedMs = Math.sqrt((currentVel[0]||0)**2 + (currentVel[1]||0)**2 + (currentVel[2]||0)**2);
    const speedKmh = Math.floor(speedMs * 3.6);
    setSpeed(speedKmh);

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

    const forceBase = 2500;
    const force = useNitro ? forceBase * 2.5 : forceBase;
    const steer = 0.5;

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
      <mesh ref={chassis} name="vehicle-chassis">
        <boxGeometry args={[chassisWidth, chassisHeight, chassisLength]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0.05} />
        <mesh position={[0, 0.4, -0.2]}>
          <boxGeometry args={[chassisWidth * 0.8, 0.5, chassisLength * 0.4]} />
          <meshStandardMaterial color="#00f2ff" transparent opacity={0.4} metalness={1} roughness={0} />
        </mesh>
        
        {/* Rear thruster glow (Nitro/Exhaust) */}
        <mesh position={[0, -0.1, 1.25]}>
          <boxGeometry args={[0.5, 0.15, 0.1]} />
          <meshBasicMaterial 
            color="#00f2ff" 
            transparent 
            opacity={Math.min(0.9, (Math.sqrt((velocity?.[0]||0)**2 + (velocity?.[1]||0)**2 + (velocity?.[2]||0)**2) / 15))} 
          />
        </mesh>
      </mesh>

      {wheelRefs.map((ref, i) => (
        <group ref={ref} key={i}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.2, 16]} />
            <meshStandardMaterial color="#111" />
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
