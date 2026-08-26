import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, RECON_WAYPOINTS } from '../../store/useAppStore';

interface FlythroughControllerProps {
  controlsRef: React.RefObject<any>;
}

export const FlythroughController: React.FC<FlythroughControllerProps> = ({ controlsRef }) => {
  const { 
    isFlythroughActive, 
    flythroughProgress,
    flythroughSpeed,
    waypoints,
    setFlythroughProgress,
    updateCameraCoords 
  } = useAppStore();

  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  // Construct Catmull-Rom Spline Curve from flight waypoints
  const { positionSpline, lookAtSpline } = useMemo(() => {
    const activeWps = waypoints && waypoints.length >= 2 ? waypoints : RECON_WAYPOINTS;
    const posPoints = activeWps.map(wp => new THREE.Vector3(...wp.position));
    const lookPoints = activeWps.map(wp => new THREE.Vector3(...wp.lookAt));

    const posCurve = new THREE.CatmullRomCurve3(posPoints, true, 'centripetal', 0.5);
    const lookCurve = new THREE.CatmullRomCurve3(lookPoints, true, 'centripetal', 0.5);

    return { positionSpline: posCurve, lookAtSpline: lookCurve };
  }, [waypoints]);

  useFrame((_, delta) => {
    // 1. Always update HUD telemetry camera coordinates
    const pos = camera.position;
    const heading = Math.round((Math.atan2(pos.x, pos.z) * (180 / Math.PI) + 360) % 360);
    const alt = Math.max(0, Math.round(pos.y * 1.5));
    const pitch = Math.round(Math.asin(-camera.rotation.x) * (180 / Math.PI));

    updateCameraCoords({
      x: Number(pos.x.toFixed(1)),
      y: Number(pos.y.toFixed(1)),
      z: Number(pos.z.toFixed(1)),
      heading,
      pitch,
      alt
    });

    // 2. Perform smooth spline flight interpolation when active
    if (!isFlythroughActive) return;

    // Advance progress along spline (full loop takes ~30 seconds at 1x speed)
    const deltaProgress = (delta / 30) * flythroughSpeed;
    const newProgress = (flythroughProgress + deltaProgress) % 1.0;
    setFlythroughProgress(newProgress);

    // Get interpolated camera position and lookAt target from Catmull-Rom spline
    positionSpline.getPointAt(newProgress, currentPos.current);
    lookAtSpline.getPointAt(newProgress, targetLook.current);

    // Smooth lerp camera position
    camera.position.lerp(currentPos.current, 0.1);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, 0.1);
      controlsRef.current.update();
    }
  });

  return null;
};
