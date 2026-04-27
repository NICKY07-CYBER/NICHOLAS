import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useRaycastVehicle } from '@react-three/cannon';
import { useControls } from '../../hooks/useControls';
import * as THREE from 'three';

const chassisWidth = 1.2;
const chassisHeight = 0.6;
const chassisLength = 2.4;
const wheelRadius = 0.35;

const PARTICLE_COUNT = 30;

export const Vehicle = ({ position = [0, 5, 0] }: { position?: [number, number, number] }) => {
  const controls = useControls();
  const [velocity, setVelocity] = useState([0, 0, 0]);

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

  // Particles for smoke/heat
  const particles = useMemo(() => {
    const p = new Array(PARTICLE_COUNT).fill(0).map(() => ({
      pos: new THREE.Vector3(),
      life: 0,
      speed: new THREE.Vector3(),
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
    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    frictionSlip: 2.5,
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
    if (!vehicleApi || !chassisApi) return;
    
    const { forward, backward, left, right, brake, reset } = controls;
    const force = 2500;
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

      const bForce = brake ? 100 : 0;
      if (vehicleApi.setBrake) {
        vehicleApi.setBrake(bForce, 2);
        vehicleApi.setBrake(bForce, 3);
      }

      if (reset) {
        chassisApi.position?.set(0, 5, 0);
        chassisApi.velocity?.set(0, 0, 0);
        chassisApi.rotation?.set(0, 0, 0);
        chassisApi.angularVelocity?.set(0, 0, 0);
      }

      // Particle Logic (Smoke during drift)
      const currentVel = velocity || [0, 0, 0];
      const speedSq = (currentVel[0]||0)**2 + (currentVel[1]||0)**2 + (currentVel[2]||0)**2;
      const speed = Math.sqrt(speedSq);
      const isDrifting = speed > 5 && (left || right || brake);
      
      if (isDrifting && Math.random() > 0.5 && particles) {
        const deadParticle = particles.find(p => p.life <= 0);
        if (deadParticle && vehicle.current && wheelRefs[2] && wheelRefs[2].current) {
          const wheelPos = new THREE.Vector3();
          wheelPos.setFromMatrixPosition(wheelRefs[2].current.matrixWorld);
          deadParticle.pos.copy(wheelPos);
          deadParticle.life = 1.0;
          deadParticle.speed.set((Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5);
        }
      }

      // Update particles
      if (particleRefs.current && particleRefs.current.children && particles) {
        particleRefs.current.children.forEach((mesh, i) => {
          const p = particles[i];
          if (p && p.life > 0 && mesh && mesh.position) {
            p.pos.add(p.speed);
            p.life -= delta * 2;
            mesh.position.copy(p.pos);
            mesh.scale.setScalar(Math.max(0.01, p.life));
            mesh.visible = true;
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
      <mesh ref={chassis}>
        <boxGeometry args={[chassisWidth, chassisHeight, chassisLength]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
        <mesh position={[0, 0.4, -0.2]}>
          <boxGeometry args={[chassisWidth * 0.8, 0.5, chassisLength * 0.4]} />
          <meshStandardMaterial color="#444" transparent opacity={0.6} />
        </mesh>
        
        {/* Engine Heat distortion (glowing red mesh when moving fast) */}
        <mesh position={[0, -0.1, 1.2]}>
          <boxGeometry args={[0.4, 0.1, 0.3]} />
          <meshBasicMaterial 
            color="#ff4400" 
            transparent 
            opacity={Math.min(0.8, (Math.sqrt((velocity?.[0]||0)**2 + (velocity?.[1]||0)**2 + (velocity?.[2]||0)**2) / 20))} 
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
