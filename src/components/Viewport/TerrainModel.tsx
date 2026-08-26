import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, type ViewMode } from '../../store/useAppStore';

interface TerrainModelProps {
  onPointerClick?: (point: [number, number, number]) => void;
}

class GltfErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn("GltfErrorBoundary caught loading error, rendering fallback terrain:", error);
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const LoadedGltfModel: React.FC<{ url: string; viewMode: ViewMode; onClick?: (e: ThreeEvent<MouseEvent>) => void }> = ({ url, viewMode, onClick }) => {
  const { scene } = useGLTF(url, 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  
  const { clonedScene, pointPositions, pointColors } = useMemo(() => {
    const cloned = scene.clone();
    
    // 1. Calculate Bounding Box to Auto-Center and Auto-Scale Model
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetScale = maxDim > 0 ? 35.0 / maxDim : 1.0;
    
    cloned.position.set(-center.x * targetScale, -center.y * targetScale, -center.z * targetScale);
    cloned.scale.set(targetScale, targetScale, targetScale);

    const ptsPos: number[] = [];
    const ptsCols: number[] = [];

    // 2. Traverse and apply ViewMode materials & extract point cloud attributes
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.geometry) {
          const posAttr = mesh.geometry.attributes.position;
          if (posAttr) {
            for (let i = 0; i < posAttr.count; i++) {
              const vx = posAttr.getX(i) * targetScale - center.x * targetScale;
              const vy = posAttr.getY(i) * targetScale - center.y * targetScale;
              const vz = posAttr.getZ(i) * targetScale - center.z * targetScale;
              ptsPos.push(vx, vy, vz);
              ptsCols.push(0.31, 0.75, 0.55);
            }
          }
        }

        // 3. Automatically compute height-based photogrammetry vertex colormap if no vertex colors exist
        if (mesh.geometry && !mesh.geometry.attributes.color) {
          const posAttr = mesh.geometry.attributes.position;
          if (posAttr) {
            const colors: number[] = [];
            let minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < posAttr.count; i++) {
              const y = posAttr.getY(i);
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
            const rangeY = Math.max(0.1, maxY - minY);

            for (let i = 0; i < posAttr.count; i++) {
              const y = posAttr.getY(i);
              const normY = (y - minY) / rangeY;

              if (normY < 0.3) {
                colors.push(0.23, 0.51, 0.77); // Steel Blue low-elevation
              } else if (normY < 0.7) {
                colors.push(0.31, 0.75, 0.55); // Muted Green terrain
              } else if (normY < 0.9) {
                colors.push(0.91, 0.64, 0.24); // Amber ridge
              } else {
                colors.push(0.93, 0.92, 0.89); // Cream peak
              }
            }
            mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            mesh.geometry.computeVertexNormals();
          }
        }

        // Apply ViewMode material customization
        if (viewMode === 'wireframe') {
          mesh.material = new THREE.MeshStandardMaterial({
            wireframe: true,
            color: '#4FA9A0',
            emissive: '#2A3B32',
            emissiveIntensity: 0.5,
            roughness: 0.2
          });
        } else if (viewMode === 'thermal') {
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#E8A33D',
            emissive: '#4FA9A0',
            emissiveIntensity: 0.6,
            roughness: 0.3,
            metalness: 0.4
          });
        } else if (viewMode === 'elevation') {
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.5,
            flatShading: true
          });
        } else {
          // Textured mode: Rich photogrammetry terrain shading with vertex colors
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.65,
            metalness: 0.15,
            flatShading: false
          });
        }
      }
    });

    return {
      clonedScene: cloned,
      pointPositions: new THREE.Float32BufferAttribute(ptsPos, 3),
      pointColors: new THREE.Float32BufferAttribute(ptsCols, 3)
    };
  }, [scene, viewMode]);

  if (viewMode === 'pointcloud') {
    return (
      <points onClick={onClick}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions.array, 3]} />
          <bufferAttribute attach="attributes-color" args={[pointColors.array, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.35} vertexColors={true} sizeAttenuation={true} />
      </points>
    );
  }

  return <primitive object={clonedScene} onClick={onClick} />;
};

export const TerrainModel: React.FC<TerrainModelProps> = ({ onPointerClick }) => {
  const { activeModelPath, viewMode, measurementMode, addMeasurementPoint } = useAppStore();
  const meshRef = useRef<THREE.Group>(null);

  // Handle pointer down / pick on mesh surface
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (measurementMode) {
      const pt: [number, number, number] = [e.point.x, e.point.y, e.point.z];
      addMeasurementPoint(pt);
      if (onPointerClick) onPointerClick(pt);
    }
  };

  // PLACEHOLDER_MODEL: Stand-in procedural aerial survey model until teammate pipeline output is ready
  const { geometry, pointPositions, pointColors } = useMemo(() => {
    const width = 60;
    const depth = 60;
    const segments = 60;
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    geo.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const posAttr = geo.attributes.position;
    const colors: number[] = [];
    const ptsPos: number[] = [];
    const ptsCols: number[] = [];

    // Ground plane: Mostly flat terrain with gentle micro-relief (0.3m height variance max)
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      let y = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.35 + Math.sin(x * 0.03 + 0.5) * 0.25;

      // Flatten building footprints at ground level (y = 0.0)
      if (
        (Math.abs(x - 4) < 10 && Math.abs(z - 2) < 7) ||
        (Math.abs(x + 14) < 9 && Math.abs(z - 6) < 6) ||
        (Math.abs(x + 8) < 4 && Math.abs(z + 12) < 4) ||
        (Math.abs(x - 14) < 8 && Math.abs(z + 10) < 6)
      ) {
        y = 0.0;
      }

      posAttr.setY(i, y);
      ptsPos.push(x, y, z);

      // Aerial survey ground colormap (Natural grass green + asphalt access roads)
      const isRoad = (Math.abs(x - 4) < 2.2) || (Math.abs(z + 2) < 2.2);
      if (isRoad) {
        colors.push(0.25, 0.28, 0.27); // Dark asphalt road
        ptsCols.push(0.4, 0.45, 0.43);
      } else {
        colors.push(0.18, 0.31, 0.22); // Lush natural grass green
        ptsCols.push(0.31, 0.65, 0.45);
      }
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return {
      geometry: geo,
      pointPositions: new THREE.Float32BufferAttribute(ptsPos, 3),
      pointColors: new THREE.Float32BufferAttribute(ptsCols, 3)
    };
  }, []);

  const renderMaterialOrPointCloud = (mode: ViewMode) => {
    if (mode === 'pointcloud') {
      return (
        <points onClick={handleClick}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[pointPositions.array, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[pointColors.array, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.35}
            vertexColors={true}
            sizeAttenuation={true}
          />
        </points>
      );
    }

    switch (mode) {
      case 'wireframe':
        return (
          <mesh geometry={geometry} receiveShadow castShadow onClick={handleClick}>
            <meshStandardMaterial
              wireframe={true}
              color="#4FA9A0"
              emissive="#2A3B32"
              emissiveIntensity={0.5}
              roughness={0.2}
            />
          </mesh>
        );
      case 'elevation':
        return (
          <mesh geometry={geometry} receiveShadow castShadow onClick={handleClick}>
            <meshStandardMaterial
              vertexColors={true}
              roughness={0.6}
              metalness={0.1}
              flatShading={true}
            />
          </mesh>
        );
      case 'thermal':
        return (
          <mesh geometry={geometry} receiveShadow castShadow onClick={handleClick}>
            <meshStandardMaterial
              color="#E8A33D"
              emissive="#4FA9A0"
              emissiveIntensity={0.6}
              roughness={0.3}
              metalness={0.4}
              wireframe={false}
            />
          </mesh>
        );
      case 'textured':
      default:
        return (
          <mesh geometry={geometry} receiveShadow castShadow onClick={handleClick}>
            <meshStandardMaterial
              vertexColors={true}
              roughness={0.65}
              metalness={0.15}
              flatShading={false}
            />
          </mesh>
        );
    }
  };

  // PLACEHOLDER_MODEL: Full 3D Area Reconstruction Scene
  const fallbackScene = (
    <group>
      {renderMaterialOrPointCloud(viewMode)}

      {/* Ground Grid Overlay */}
      {viewMode === 'textured' && (
        <mesh geometry={geometry} position={[0, 0.02, 0]}>
          <meshBasicMaterial
            wireframe={true}
            color="#2A3B32"
            transparent={true}
            opacity={0.2}
          />
        </mesh>
      )}

      {/* Upright Photogrammetric Buildings sitting flush on Ground (Y=0) */}
      {viewMode !== 'pointcloud' && (
        <group>
          {/* Building 1: Main Command Facility (18m x 12m, Height: 7m) */}
          <group position={[4, 0, 2]}>
            {/* Concrete Walls */}
            <mesh position={[0, 3.5, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[18, 7, 12]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#E8A33D' : (viewMode === 'wireframe' ? '#4FA9A0' : '#4E5752')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.5} 
              />
            </mesh>
            {/* Terracotta Red-Brown Roof Tile */}
            <mesh position={[0, 7.2, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[18.4, 0.4, 12.4]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#4FA9A0' : (viewMode === 'wireframe' ? '#4FA9A0' : '#7A3B28')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.4} 
              />
            </mesh>
            {/* Rooftop HVAC Box Units */}
            <mesh position={[-3, 7.8, 2]} castShadow onClick={handleClick}>
              <boxGeometry args={[3, 1.2, 2]} />
              <meshStandardMaterial color={viewMode === 'thermal' ? '#E8A33D' : '#38403C'} />
            </mesh>
            <mesh position={[4, 7.8, -2]} castShadow onClick={handleClick}>
              <cylinderGeometry args={[1.5, 1.5, 0.6, 16]} />
              <meshStandardMaterial color={viewMode === 'thermal' ? '#4FA9A0' : '#78857F'} />
            </mesh>
          </group>

          {/* Building 2: Storage Hangar (16m x 10m, Height: 5.5m) */}
          <group position={[-14, 0, 6]}>
            {/* Industrial Walls */}
            <mesh position={[0, 2.75, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[16, 5.5, 10]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#4FA9A0' : (viewMode === 'wireframe' ? '#4FA9A0' : '#353D38')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.6} 
              />
            </mesh>
            {/* Dark Slate Roof */}
            <mesh position={[0, 5.7, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[16.4, 0.4, 10.4]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#E8A33D' : (viewMode === 'wireframe' ? '#4FA9A0' : '#242927')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.3} 
              />
            </mesh>
          </group>

          {/* Building 3: Guard Control Tower (6m x 6m, Height: 14m) */}
          <group position={[-8, 0, -12]}>
            {/* Upright Concrete Tower */}
            <mesh position={[0, 7.0, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[6, 14, 6]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#E8A33D' : (viewMode === 'wireframe' ? '#4FA9A0' : '#3D4742')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.4} 
              />
            </mesh>
            {/* Tower Observation Cabin */}
            <mesh position={[0, 15.0, 0]} castShadow onClick={handleClick}>
              <boxGeometry args={[6.4, 2.0, 6.4]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#E8A33D' : '#E8A33D'} 
                emissive="#E8A33D"
                emissiveIntensity={0.3}
                roughness={0.2} 
              />
            </mesh>
          </group>

          {/* Building 4: Admin Annex / Quarters (14m x 10m, Height: 5m) */}
          <group position={[14, 0, -10]}>
            {/* Tan Walls */}
            <mesh position={[0, 2.5, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[14, 5, 10]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#4FA9A0' : (viewMode === 'wireframe' ? '#4FA9A0' : '#5E5448')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.5} 
              />
            </mesh>
            {/* Flat Gravel Roof */}
            <mesh position={[0, 5.2, 0]} castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[14.4, 0.4, 10.4]} />
              <meshStandardMaterial 
                color={viewMode === 'thermal' ? '#E8A33D' : (viewMode === 'wireframe' ? '#4FA9A0' : '#2D3330')} 
                wireframe={viewMode === 'wireframe'}
                roughness={0.4} 
              />
            </mesh>
          </group>

          {/* Helipad Ring Dropzone (Diameter 8m) */}
          <mesh position={[-8, 0.05, 10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={handleClick}>
            <ringGeometry args={[3.8, 4.5, 32]} />
            <meshBasicMaterial color="#E8A33D" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Ground Reference Grid */}
      <gridHelper 
        args={[60, 30, '#E8A33D', '#2A3B32']} 
        position={[0, 0, 0]} 
      />
    </group>
  );

  return (
    <group ref={meshRef}>
      {activeModelPath ? (
        <GltfErrorBoundary fallback={fallbackScene}>
          <React.Suspense fallback={fallbackScene}>
            <LoadedGltfModel url={activeModelPath} viewMode={viewMode} onClick={handleClick} />
          </React.Suspense>
        </GltfErrorBoundary>
      ) : (
        fallbackScene
      )}
    </group>
  );
};
