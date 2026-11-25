import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { CompanionAnimation } from '@/types/phygital';
import { Companion2DFallback } from './Companion2DFallback';

interface CompanionStage3DProps {
  animation: CompanionAnimation;
  lowPower2D?: boolean;
  onTapCharacter?: (character: 'leo' | 'maya') => void;
}

class ThreeErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function LeoCharacter3D({
  animation,
  onTap,
}: {
  animation: CompanionAnimation;
  onTap?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const glassRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      if (animation === 'celebration' || animation === 'happy') {
        groupRef.current.position.y = Math.abs(Math.sin(t * 6)) * 0.25;
        groupRef.current.rotation.y = Math.sin(t * 3) * 0.16;
      } else if (animation === 'thinking') {
        groupRef.current.position.y = Math.sin(t * 1.5) * 0.03;
        groupRef.current.rotation.z = Math.sin(t * 1.2) * 0.06;
      } else {
        groupRef.current.position.y = Math.sin(t * 2.1) * 0.05;
        groupRef.current.rotation.y = Math.sin(t * 0.7) * 0.08 + 0.15;
        groupRef.current.rotation.z = 0;
      }
    }
    if (headRef.current) {
      headRef.current.rotation.x =
        animation === 'talking' ? Math.sin(t * 9) * 0.08 : Math.sin(t * 1.4) * 0.04;
      headRef.current.rotation.z = animation === 'surprised' ? -0.14 : 0;
    }
    if (glassRef.current) {
      glassRef.current.rotation.z =
        animation === 'thinking' || animation === 'talking'
          ? Math.sin(t * 4) * 0.22
          : Math.sin(t * 1.8) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[-0.95, 0, 0]} onClick={onTap}>
      {/* Torso / Explorer Vest */}
      <RoundedBox args={[0.72, 0.82, 0.48]} radius={0.14} position={[0, 0.55, 0]} castShadow>
        <meshStandardMaterial color="#C77B5A" roughness={0.65} />
      </RoundedBox>
      {/* Shirt front */}
      <RoundedBox args={[0.42, 0.65, 0.5]} radius={0.08} position={[0, 0.56, 0.02]}>
        <meshStandardMaterial color="#F2ECE4" roughness={0.7} />
      </RoundedBox>
      {/* Notebook tucked at waist */}
      <RoundedBox args={[0.24, 0.3, 0.08]} radius={0.03} position={[-0.28, 0.45, 0.24]}>
        <meshStandardMaterial color="#E8C878" roughness={0.5} />
      </RoundedBox>
      {/* Legs */}
      <mesh position={[-0.17, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.1, 0.34, 16]} />
        <meshStandardMaterial color="#7A583E" />
      </mesh>
      <mesh position={[0.17, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.1, 0.34, 16]} />
        <meshStandardMaterial color="#7A583E" />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 1.32, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.38, 28, 28]} />
          <meshStandardMaterial color="#F6D5B0" roughness={0.6} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.12, -0.04]} castShadow>
          <sphereGeometry args={[0.39, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          <meshStandardMaterial color="#4A3525" roughness={0.8} />
        </mesh>
        {/* Glasses */}
        <mesh position={[-0.14, 0.02, 0.35]}>
          <torusGeometry args={[0.1, 0.022, 12, 24]} />
          <meshStandardMaterial color="#4A3525" />
        </mesh>
        <mesh position={[0.14, 0.02, 0.35]}>
          <torusGeometry args={[0.1, 0.022, 12, 24]} />
          <meshStandardMaterial color="#4A3525" />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.14, 0.02, 0.34]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#2D1E12" />
        </mesh>
        <mesh position={[0.14, 0.02, 0.34]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#2D1E12" />
        </mesh>
      </group>

      {/* Glowing Magnifying Glass */}
      <group ref={glassRef} position={[0.52, 0.8, 0.25]}>
        <mesh position={[0, -0.18, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.035, 0.035, 0.38, 12]} />
          <meshStandardMaterial color="#7A583E" />
        </mesh>
        <mesh position={[0.06, 0.08, 0]}>
          <torusGeometry args={[0.16, 0.03, 12, 28]} />
          <meshStandardMaterial color="#4A3525" />
        </mesh>
        <mesh position={[0.06, 0.08, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.02, 24]} />
          <meshStandardMaterial
            color="#E8C878"
            emissive="#E8C878"
            emissiveIntensity={animation === 'celebration' ? 0.9 : 0.45}
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>
    </group>
  );
}

function MayaCharacter3D({
  animation,
  onTap,
}: {
  animation: CompanionAnimation;
  onTap?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      if (animation === 'celebration' || animation === 'happy') {
        groupRef.current.position.y = Math.abs(Math.sin(t * 6.4 + 0.5)) * 0.28;
        groupRef.current.rotation.y = Math.sin(t * 3.2) * 0.18 - 0.15;
      } else {
        groupRef.current.position.y = Math.sin(t * 2.3 + 1) * 0.05;
        groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.08 - 0.2;
      }
    }
    if (headRef.current) {
      headRef.current.rotation.x =
        animation === 'talking' ? Math.sin(t * 8.5 + 0.6) * 0.09 : Math.sin(t * 1.6) * 0.04;
      headRef.current.rotation.z = animation === 'thinking' ? 0.12 : 0;
    }
  });

  return (
    <group ref={groupRef} position={[0.95, 0, 0]} onClick={onTap}>
      {/* Explorer Tunic */}
      <RoundedBox args={[0.7, 0.84, 0.46]} radius={0.16} position={[0, 0.55, 0]} castShadow>
        <meshStandardMaterial color="#A5B49A" roughness={0.65} />
      </RoundedBox>
      {/* Adventure Satchel */}
      <RoundedBox args={[0.28, 0.26, 0.14]} radius={0.05} position={[0.34, 0.44, 0.18]}>
        <meshStandardMaterial color="#C77B5A" roughness={0.55} />
      </RoundedBox>
      {/* Nature Leaf Pin */}
      <mesh position={[-0.18, 0.72, 0.25]} rotation={[0, 0, 0.4]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#E8C878" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.16, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.095, 0.34, 16]} />
        <meshStandardMaterial color="#4A3525" />
      </mesh>
      <mesh position={[0.16, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.095, 0.34, 16]} />
        <meshStandardMaterial color="#4A3525" />
      </mesh>

      {/* Head & Curly Hair Puffs */}
      <group ref={headRef} position={[0, 1.32, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.37, 28, 28]} />
          <meshStandardMaterial color="#E9B88E" roughness={0.6} />
        </mesh>
        <mesh position={[-0.32, 0.14, -0.04]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#4A3525" roughness={0.85} />
        </mesh>
        <mesh position={[0.32, 0.14, -0.04]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#4A3525" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.26, -0.06]} castShadow>
          <sphereGeometry args={[0.32, 18, 18]} />
          <meshStandardMaterial color="#4A3525" roughness={0.85} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.13, 0.02, 0.34]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#2D1E12" />
        </mesh>
        <mesh position={[0.13, 0.02, 0.34]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#2D1E12" />
        </mesh>
      </group>
    </group>
  );
}

export function CompanionStage3D({ animation, lowPower2D = false, onTapCharacter }: CompanionStage3DProps) {
  const [webglReady, setWebglReady] = useState(true);
  const [force2D, setForce2D] = useState(lowPower2D);

  useEffect(() => {
    setWebglReady(detectWebGLSupport());
  }, []);

  useEffect(() => {
    setForce2D(lowPower2D);
  }, [lowPower2D]);

  const use2D = force2D || !webglReady;

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl border-2 border-earth/15 bg-gradient-to-b from-[#FAF8F5] to-[#E8C878]/25 shadow-storybook sm:h-72">
      <button
        type="button"
        onClick={() => setForce2D((v) => !v)}
        className="absolute right-3 top-3 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-earth shadow-sm transition hover:bg-white"
      >
        {use2D ? 'Switch to 3D Stage' : '2D Eco Mode'}
      </button>

      {use2D ? (
        <Companion2DFallback animation={animation} onTapCharacter={onTapCharacter} />
      ) : (
        <ThreeErrorBoundary fallback={<Companion2DFallback animation={animation} onTapCharacter={onTapCharacter} />}>
          <Suspense fallback={<Companion2DFallback animation={animation} onTapCharacter={onTapCharacter} />}>
            <Canvas shadows camera={{ position: [0, 1.5, 4.1], fov: 42 }}>
              <color attach="background" args={['#FAF8F5']} />
              <ambientLight intensity={0.85} />
              <directionalLight position={[4, 6, 5]} intensity={1.25} castShadow color="#FFF8EA" />
              <pointLight position={[-3, 3, 2]} intensity={0.45} color="#E8C878" />

              {/* Warm meadow island */}
              <mesh position={[0, -0.22, 0]} receiveShadow>
                <cylinderGeometry args={[2.5, 2.7, 0.25, 40]} />
                <meshStandardMaterial color="#A5B49A" roughness={0.85} />
              </mesh>
              <mesh position={[0, -0.36, 0]}>
                <cylinderGeometry args={[2.65, 2.4, 0.16, 40]} />
                <meshStandardMaterial color="#F2ECE4" roughness={0.9} />
              </mesh>

              <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.12}>
                <LeoCharacter3D animation={animation} onTap={() => onTapCharacter?.('leo')} />
                <MayaCharacter3D animation={animation} onTap={() => onTapCharacter?.('maya')} />
              </Float>

              <Sparkles
                count={animation === 'celebration' ? 45 : 18}
                scale={[4.2, 2.4, 2]}
                size={animation === 'celebration' ? 5 : 2.5}
                speed={0.45}
                color="#E8C878"
              />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2.15}
              />
            </Canvas>
          </Suspense>
        </ThreeErrorBoundary>
      )}
    </div>
  );
}
