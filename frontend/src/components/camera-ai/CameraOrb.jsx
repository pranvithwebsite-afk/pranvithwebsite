import React, { Component, Suspense, memo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { Camera } from 'lucide-react';

class ModelErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const CameraModel = ({ reducedMotion }) => {
  const { scene } = useGLTF('/models/camera.glb');
  const cameraRef = React.useRef();
  const model = React.useMemo(() => scene.clone(true), [scene]);

  useFrame(({ clock }) => {
    if (!cameraRef.current || reducedMotion) return;
    const elapsed = clock.getElapsedTime();
    cameraRef.current.rotation.y = Math.sin(elapsed * 0.45) * 0.2 - 0.2;
    cameraRef.current.position.y = Math.sin(elapsed * 0.7) * 0.04;
  });

  return <primitive ref={cameraRef} object={model} scale={1.15} rotation={[0.08, -0.2, 0]} />;
};

const FallbackCamera = ({ compact = false }) => (
  <span className={`camera-ai-fallback-icon ${compact ? 'camera-ai-fallback-icon--compact' : ''}`} aria-hidden="true">
    <Camera strokeWidth={1.5} />
  </span>
);

const CameraOrb = ({ compact = false, active = true }) => {
  const [modelAvailable, setModelAvailable] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (compact) return undefined;
    let current = true;
    const controller = new AbortController();
    const loadModel = () => fetch('/models/camera.glb', { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        if (!current) return;
        if (response.ok) useGLTF.preload('/models/camera.glb');
        setModelAvailable(response.ok);
      })
      .catch(() => current && setModelAvailable(false));
    const idleId = window.requestIdleCallback ? window.requestIdleCallback(loadModel, { timeout: 1800 }) : window.setTimeout(loadModel, 500);
    return () => { current = false; controller.abort(); window.cancelIdleCallback ? window.cancelIdleCallback(idleId) : window.clearTimeout(idleId); };
  }, [compact]);

  // The compact header avatar intentionally remains static: this avoids a
  // second WebGL canvas and keeps the chat panel responsive on mobile.
  if (compact || modelAvailable !== true || !active) return <FallbackCamera compact={compact} />;

  return (
    <ModelErrorBoundary fallback={<FallbackCamera compact={compact} />}>
      <Canvas
        className="camera-ai-canvas"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2.7], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop={active && !reducedMotion ? 'always' : 'demand'}
      >
        <ambientLight intensity={1.7} />
        <directionalLight position={[2, 3, 4]} intensity={2.3} color="#d8c6ff" />
        <Suspense fallback={null}>
          <CameraModel reducedMotion={reducedMotion} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </ModelErrorBoundary>
  );
};

export default memo(CameraOrb);
