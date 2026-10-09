// tslint:disable
/* eslint-disable */
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getConfig, LEVELS } from './constants';
import { GameState, LevelConfig } from './types';
import { gameAudio } from './utils/helper';

interface GameSceneProps {
  gameState: GameState;
  currentLevel: LevelConfig;
  playerPos: { x: number; z: number };
  visitedTiles: Set<string>;
  animating: boolean;
  isPaused: boolean;
  onStepComplete?: () => void;
}

// Scratch reusable variables to avoid allocations in useFrame
const tempVec = new THREE.Vector3();
const tempCamTarget = new THREE.Vector3();

// Floating dust embers in midnight space
function AmbientEmbers({ count = 60 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 8 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      sc[i] = Math.random() * 0.08 + 0.03;
    }
    return [pos, sc];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const positionsAttr = pointsRef.current.geometry.attributes.position;
    const arr = positionsAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * 0.2;
      if (arr[i * 3 + 1] > 8) {
        arr[i * 3 + 1] = -1;
      }
    }
    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#38bdf8"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Exit Beacon with rotating diamond and light pillar
function ExitBeacon({ x, z }: { x: number; z: number }) {
  const beaconRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 1.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 2.0;
    }
  });

  return (
    <group position={[x, 0.35, z]}>
      {/* Light Pillar */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 2.5, 16, 1, true]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Hovering Crystal Core */}
      <group ref={beaconRef} position={[0, 0.5, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#10b981"
            emissiveIntensity={1.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </group>

      {/* Rotating Base Energy Ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}>
        <ringGeometry args={[0.35, 0.48, 24]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Local Emerald Point Light */}
      <pointLight
        color="#10b981"
        intensity={18}
        distance={6}
        decay={1.5}
        position={[0, 0.8, 0]}
      />
    </group>
  );
}

// Single Tile Mesh with smooth sink animation on deactivation
function TileMesh({
  x,
  z,
  type,
  isVisited,
  isStart,
}: {
  x: number;
  z: number;
  type: number;
  isVisited: boolean;
  isStart: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const currentY = useRef<number>(0);
  const targetY = isVisited ? -1.2 : 0;
  const currentOpacity = useRef<number>(isVisited ? 0.2 : 1.0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dropSpeed = getConfig('tileDropSpeed') || 4.0;
    currentY.current = THREE.MathUtils.lerp(
      currentY.current,
      targetY,
      delta * dropSpeed,
    );
    meshRef.current.position.y = currentY.current;

    const targetOp = isVisited ? 0.25 : 1.0;
    currentOpacity.current = THREE.MathUtils.lerp(
      currentOpacity.current,
      targetOp,
      delta * dropSpeed,
    );
  });

  if (type === 0) return null; // Void

  // Wall Monolith
  if (type === 2) {
    return (
      <group position={[x, 0, z]}>
        {/* Wall Pillar Body */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 1.2, 0.92]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>
        {/* Top Trim Cap */}
        <mesh position={[0, 1.22, 0]} castShadow>
          <boxGeometry args={[0.96, 0.05, 0.96]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
        {/* Accent Edge Line */}
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.8]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      </group>
    );
  }

  // Walkable Tile (Floor / Start / Exit Base)
  return (
    <group ref={meshRef} position={[x, 0, z]}>
      {/* Base Tile Box */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[0.92, 0.2, 0.92]} />
        <meshStandardMaterial
          color={isVisited ? '#0f172a' : isStart ? '#0369a1' : '#1e293b'}
          roughness={isVisited ? 0.9 : 0.3}
          metalness={isVisited ? 0.1 : 0.5}
        />
      </mesh>

      {/* Glowing Top Surface Plate */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow>
        <planeGeometry args={[0.88, 0.88]} />
        <meshStandardMaterial
          color={
            isVisited
              ? '#1e293b'
              : type === 3
              ? '#064e3b'
              : isStart
              ? '#075985'
              : '#0f172a'
          }
          emissive={
            isVisited
              ? '#000000'
              : type === 3
              ? '#059669'
              : isStart
              ? '#0284c7'
              : '#0e7490'
          }
          emissiveIntensity={isVisited ? 0.0 : type === 3 ? 0.6 : 0.25}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Glowing Edge Border when Active */}
      {!isVisited && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.44, 4]} />
          <meshBasicMaterial
            color={type === 3 ? '#10b981' : isStart ? '#38bdf8' : '#06b6d4'}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Player Avatar with smooth glide lerp and subtle floating bounce
function PlayerAvatar({
  targetPos,
  isPaused,
}: {
  targetPos: { x: number; z: number };
  isPaused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef<THREE.Vector3>(
    new THREE.Vector3(targetPos.x, 0.35, targetPos.z),
  );
  const targetVec = useRef<THREE.Vector3>(
    new THREE.Vector3(targetPos.x, 0.35, targetPos.z),
  );
  const moveProgress = useRef<number>(1);
  const startPos = useRef<THREE.Vector3>(
    new THREE.Vector3(targetPos.x, 0.35, targetPos.z),
  );

  // Update target when grid position changes
  useEffect(() => {
    if (
      targetPos.x !== targetVec.current.x ||
      targetPos.z !== targetVec.current.z
    ) {
      startPos.current.copy(currentPos.current);
      targetVec.current.set(targetPos.x, 0.35, targetPos.z);
      moveProgress.current = 0;
    }
  }, [targetPos.x, targetPos.z]);

  useFrame((state, delta) => {
    if (isPaused || !groupRef.current) return;

    const moveSpeed = getConfig('playerMoveSpeed') || 10;
    if (moveProgress.current < 1) {
      moveProgress.current = Math.min(
        1,
        moveProgress.current + delta * moveSpeed,
      );
      // Smooth step hop arc
      const t = moveProgress.current;
      const hop = Math.sin(t * Math.PI) * 0.25;

      currentPos.current.x = THREE.MathUtils.lerp(
        startPos.current.x,
        targetVec.current.x,
        t,
      );
      currentPos.current.z = THREE.MathUtils.lerp(
        startPos.current.z,
        targetVec.current.z,
        t,
      );
      currentPos.current.y = 0.35 + hop;
    } else {
      // Idle breathing float
      const idleFloat = Math.sin(state.clock.elapsedTime * 3) * 0.04;
      currentPos.current.y = 0.35 + idleFloat;
    }

    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y += delta * 1.2;
  });

  return (
    <group
      ref={groupRef}
      position={[targetPos.x, 0.35, targetPos.z]}>
      {/* Outer Sleek Floating Crystal */}
      <mesh castShadow>
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#06b6d4"
          emissiveIntensity={1.4}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Inner Core */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Directional Beacon Aura Light */}
      <pointLight
        color="#00f0ff"
        intensity={25}
        distance={7}
        decay={1.2}
        position={[0, 0.2, 0]}
      />
    </group>
  );
}

// Camera Rig tracking the center of the level grid smoothly
function CameraController({
  cols,
  rows,
}: {
  cols: number;
  rows: number;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const centerX = (cols - 1) * 0.5;
    const centerZ = (rows - 1) * 0.5;
    const angleDeg = getConfig('cameraAngle') || 56;
    const dist = getConfig('cameraDistance') || 14;

    const angleRad = THREE.MathUtils.degToRad(angleDeg);
    const desiredY = Math.sin(angleRad) * dist;
    const desiredOffsetZ = Math.cos(angleRad) * dist;

    tempVec.set(centerX, desiredY, centerZ + desiredOffsetZ);
    camera.position.lerp(tempVec, delta * 4);

    tempCamTarget.set(centerX, 0, centerZ);
    camera.lookAt(tempCamTarget);
  });

  return null;
}

export function GameScene({
  gameState,
  currentLevel,
  playerPos,
  visitedTiles,
  isPaused,
}: GameSceneProps) {
  const { cols, rows, layout, start, exit } = currentLevel;

  return (
    <>
      {/* Lighting Rig adhering to Physically Correct Scale */}
      <hemisphereLight
        color={getConfig('hemiSkyColor') || '#38bdf8'}
        groundColor={getConfig('hemiGroundColor') || '#1e1b4b'}
        intensity={getConfig('hemiIntensity') || 0.8}
      />
      <directionalLight
        position={[cols * 0.5 + 5, 12, rows * 0.5 + 8]}
        intensity={getConfig('sunIntensity') || 4.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* Atmospheric Fog */}
      <fog
        attach="fog"
        args={[getConfig('backgroundColor') || '#080b11', 12, 32]}
      />

      {/* Floating Space Dust Particles */}
      <AmbientEmbers count={50} />

      {/* Grid Floor Mesh Tiles */}
      <group>
        {layout.map((rowArr, zIdx) =>
          rowArr.map((tileType, xIdx) => {
            const key = `${xIdx},${zIdx}`;
            const isVisited = visitedTiles.has(key);
            const isStart = xIdx === start.x && zIdx === start.z;
            const isExit = xIdx === exit.x && zIdx === exit.z;

            return (
              <React.Fragment key={key}>
                <TileMesh
                  x={xIdx}
                  z={zIdx}
                  type={tileType}
                  isVisited={isVisited}
                  isStart={isStart}
                />
                {isExit && <ExitBeacon x={xIdx} z={zIdx} />}
              </React.Fragment>
            );
          }),
        )}
      </group>

      {/* Player Crystal */}
      <PlayerAvatar targetPos={playerPos} isPaused={isPaused} />

      {/* Dynamic Camera Control */}
      <CameraController cols={cols} rows={rows} />
    </>
  );
}

export default function Game(props: GameSceneProps) {
  return (
    <Canvas
      shadows
      className="w-full h-full block"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color(
          getConfig('backgroundColor') || '#080b11',
        );
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}>
      <GameScene {...props} />
    </Canvas>
  );
}
