import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Camera3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 450;
    let height = container.clientHeight || 450;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 9.2);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. HIGH-CONTRAST LIGHTING SYSTEM (Prevents blending into dark background)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    // Ultra-Intense Electric Blue Back Rim Light
    const rimLightBlue = new THREE.PointLight(0x3b82f6, 38.0, 35);
    rimLightBlue.position.set(-4, 4, -3);
    scene.add(rimLightBlue);

    // Neon Cyan Front Light
    const fillLightCyan = new THREE.PointLight(0x60a5fa, 22.0, 30);
    fillLightCyan.position.set(4, 4, 5);
    scene.add(fillLightCyan);

    // Key Directional Spotlight
    const keyLight = new THREE.DirectionalLight(0xffffff, 6.5);
    keyLight.position.set(6, 8, 8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // 5. BRIGHT HIGH-END METALLIC MATERIALS (Titanium Slate & Polished Chrome)
    const titaniumChassis = new THREE.MeshStandardMaterial({
      color: 0x334155, // Titanium Slate
      metalness: 0.92,
      roughness: 0.15,
    });

    const polishedChrome = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Polished Chrome
      metalness: 0.98,
      roughness: 0.08,
    });

    const goldAccent = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Vivid Gold Accent Ring
      metalness: 0.98,
      roughness: 0.1,
    });

    const blueEmissive = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 9.0,
      roughness: 0.05,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      metalness: 0.2,
      roughness: 0.01,
      transmission: 0.95,
      thickness: 0.8,
      transparent: true,
      opacity: 0.9,
    });

    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x3b82f6,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });

    // 6. Camera Rig Group Construction
    const cameraRigGroup = new THREE.Group();

    // A. Main Camera Chassis
    const bodyGeo = new THREE.BoxGeometry(1.65, 1.35, 2.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, titaniumChassis);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    cameraRigGroup.add(bodyMesh);

    // Side Chrome Plates
    const sidePlateGeo = new THREE.BoxGeometry(1.68, 1.15, 0.12);
    const sidePlate1 = new THREE.Mesh(sidePlateGeo, polishedChrome);
    sidePlate1.position.set(0, 0, 0.45);
    cameraRigGroup.add(sidePlate1);

    const sidePlate2 = new THREE.Mesh(sidePlateGeo, polishedChrome);
    sidePlate2.position.set(0, 0, -0.45);
    cameraRigGroup.add(sidePlate2);

    // B. Top Handle Bar & Rig Mount
    const handleBarGeo = new THREE.BoxGeometry(0.32, 0.22, 1.9);
    const handleBar = new THREE.Mesh(handleBarGeo, polishedChrome);
    handleBar.position.set(0, 0.88, 0);
    cameraRigGroup.add(handleBar);

    const handlePost1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), titaniumChassis);
    handlePost1.position.set(0, 0.68, 0.65);
    cameraRigGroup.add(handlePost1);

    const handlePost2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), titaniumChassis);
    handlePost2.position.set(0, 0.68, -0.65);
    cameraRigGroup.add(handlePost2);

    // C. Top Angled Digital Monitor Screen
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0, 1.05, -0.2);
    monitorGroup.rotation.x = -0.32;

    const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 0.1), titaniumChassis);
    const monitorDisplay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.12), screenMaterial);
    monitorGroup.add(monitorFrame);
    monitorGroup.add(monitorDisplay);
    cameraRigGroup.add(monitorGroup);

    // D. Side Viewfinder Eyepiece Tube
    const viewfinderGroup = new THREE.Group();
    viewfinderGroup.position.set(0.98, 0.22, -0.32);
    viewfinderGroup.rotation.z = -Math.PI / 2;
    viewfinderGroup.rotation.x = 0.38;

    const vfTube = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 1.15, 32), polishedChrome);
    const vfEyecup = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.23, 0.26, 32), titaniumChassis);
    vfEyecup.position.y = 0.62;
    viewfinderGroup.add(vfTube);
    viewfinderGroup.add(vfEyecup);
    cameraRigGroup.add(viewfinderGroup);

    // E. 15mm Baseplate Dual Rails
    const railGeo = new THREE.CylinderGeometry(0.065, 0.065, 3.4, 16);
    railGeo.rotateZ(Math.PI / 2);

    const rail1 = new THREE.Mesh(railGeo, polishedChrome);
    rail1.position.set(-0.35, -0.78, 0.42);
    cameraRigGroup.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, polishedChrome);
    rail2.position.set(-0.35, -0.78, -0.42);
    cameraRigGroup.add(rail2);

    // F. Anamorphic Cinema Zoom Lens Barrel
    const lensGroup = new THREE.Group();
    lensGroup.position.set(-1.25, 0, 0);
    lensGroup.rotation.z = Math.PI / 2;

    // Lens Collar
    const lensCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.52, 32), polishedChrome);
    lensGroup.add(lensCollar);

    // Main Zoom Barrel
    const zoomBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.95, 32), titaniumChassis);
    zoomBarrel.position.y = 0.62;
    lensGroup.add(zoomBarrel);

    // Focus Ring & Gold Accent Ring
    const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.38, 32), polishedChrome);
    focusRing.position.y = 1.05;
    lensGroup.add(focusRing);

    const goldRing = new THREE.Mesh(new THREE.CylinderGeometry(0.705, 0.705, 0.06, 32), goldAccent);
    goldRing.position.y = 1.25;
    lensGroup.add(goldRing);

    // Glowing Electric Blue Emissive Ring
    const emissiveRing = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.05, 16, 64), blueEmissive);
    emissiveRing.position.y = 1.4;
    emissiveRing.rotation.x = Math.PI / 2;
    lensGroup.add(emissiveRing);

    // Glass Lens Element
    const glassLens = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), glassMaterial);
    glassLens.position.y = 1.36;
    lensGroup.add(glassLens);

    // Follow Focus Gear Knob
    const ffKnobGroup = new THREE.Group();
    ffKnobGroup.position.set(0.68, 0.72, 0.42);

    const ffWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.13, 32), polishedChrome);
    ffWheel.rotation.x = Math.PI / 2;
    ffKnobGroup.add(ffWheel);

    const ffCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.15, 32), titaniumChassis);
    ffCap.rotation.x = Math.PI / 2;
    ffKnobGroup.add(ffCap);

    lensGroup.add(ffKnobGroup);
    cameraRigGroup.add(lensGroup);

    // G. Front Matte Box & Sunhood Barn Doors
    const matteBoxGroup = new THREE.Group();
    matteBoxGroup.position.set(-2.5, 0, 0);

    // Outer Frame
    const mbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.9, 2.3), titaniumChassis);
    matteBoxGroup.add(mbFrame);

    // Top Barn Door Flag
    const topFlagGroup = new THREE.Group();
    topFlagGroup.position.set(0, 0.95, 0);
    topFlagGroup.rotation.z = 0.55;
    const topFlag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 2.3), polishedChrome);
    topFlag.position.set(0, 0.42, 0);
    topFlagGroup.add(topFlag);
    matteBoxGroup.add(topFlagGroup);

    // Bottom Barn Door Flag
    const bottomFlagGroup = new THREE.Group();
    bottomFlagGroup.position.set(0, -0.95, 0);
    bottomFlagGroup.rotation.z = -0.55;
    const bottomFlag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 2.3), polishedChrome);
    bottomFlag.position.set(0, -0.42, 0);
    bottomFlagGroup.add(bottomFlag);
    matteBoxGroup.add(bottomFlagGroup);

    cameraRigGroup.add(matteBoxGroup);

    // Scale from the component's real width so the camera stays prominent at
    // every breakpoint without being cropped on compact screens.
    const updateScale = (w) => {
      const s = w < 360 ? 0.58 : w < 520 ? 0.72 : w < 760 ? 0.9 : 1.08;
      cameraRigGroup.scale.set(s, s, s);
    };

    updateScale(width);

    // Initial angle
    cameraRigGroup.rotation.y = Math.PI * 0.75;
    cameraRigGroup.rotation.x = 0.18;
    scene.add(cameraRigGroup);

    // 7. Ambient Particle Field
    const particleCount = 120;
    const particlesGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 16;
      particlePositions[i + 1] = (Math.random() - 0.5) * 14;
      particlePositions[i + 2] = (Math.random() - 0.5) * 12;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particlesGeo, particleMat);
    scene.add(particleSystem);

    // 8. Smooth pointer-driven showcase motion
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let autoSpinAngle = 0;
    let animationFrameId = 0;

    const onGlobalMouseMove = (e) => {
      const bounds = container.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      targetX = THREE.MathUtils.clamp((e.clientX - centerX) / Math.max(bounds.width, 1), -0.5, 0.5);
      targetY = THREE.MathUtils.clamp((e.clientY - centerY) / Math.max(bounds.height, 1), -0.5, 0.5);
    };

    window.addEventListener('pointermove', onGlobalMouseMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 450;
      height = container.clientHeight || 450;

      updateScale(width);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsedTime = clock.elapsedTime;

      // Frame-rate-independent damping prevents snapping on fast pointer moves.
      mouseX = THREE.MathUtils.damp(mouseX, targetX, 4.2, delta);
      mouseY = THREE.MathUtils.damp(mouseY, targetY, 4.2, delta);

      autoSpinAngle += delta * 0.12;

      cameraRigGroup.rotation.y = Math.PI * 0.75 + mouseX * Math.PI * 0.9 + autoSpinAngle;
      cameraRigGroup.rotation.x = 0.18 + mouseY * Math.PI * 0.32;
      cameraRigGroup.rotation.z = THREE.MathUtils.damp(
        cameraRigGroup.rotation.z,
        -mouseX * 0.08,
        3.5,
        delta
      );

      // Idle Floating Sway
      cameraRigGroup.position.y = Math.sin(elapsedTime * 1.15) * 0.12;
      cameraRigGroup.position.x = Math.cos(elapsedTime * 0.72) * 0.04;

      // Particle Motion
      particleSystem.rotation.y = elapsedTime * 0.06;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('pointermove', onGlobalMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="camera-3d-stage w-full h-[360px] sm:h-[460px] lg:h-[560px] xl:h-[640px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-pan-y"
    />
  );
};

export default Camera3D;
