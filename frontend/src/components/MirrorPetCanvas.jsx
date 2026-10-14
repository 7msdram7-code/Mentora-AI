import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const THEME_COLORS = {
  violet: { base: 0x6C4CF1, accent: 0x9D85FF, eye: 0x22C3E6 },
  emerald: { base: 0x1FB57A, accent: 0x4BE3A7, eye: 0xFFD166 },
  cyan: { base: 0x22C3E6, accent: 0x7EE8FA, eye: 0x6C4CF1 },
  gold: { base: 0xF5A524, accent: 0xFFD166, eye: 0x22C3E6 },
  pink: { base: 0xE040FB, accent: 0xFF80AB, eye: 0x22C3E6 },
};

export default function MirrorPetCanvas({
  colorTheme = 'violet',
  equippedOutfit = null,
  equippedAccessory = null,
  equippedEffect = null,
  onInteract = null,
  interactive = true,
  height = '340px'
}) {
  const mountRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const sceneRef = useRef(null);
  const petGroupRef = useRef(null);
  const outfitGroupRef = useRef(null);
  const accessoryGroupRef = useRef(null);
  const effectGroupRef = useRef(null);
  const animStateRef = useRef({
    jumpProgress: 0,
    isJumping: false,
    waveProgress: 0,
    blinkTimer: 0,
    isBlinking: false
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 300;
    const heightPx = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(0, 0.6, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(2, 4, 3);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const purpleRimLight = new THREE.PointLight(0x6C4CF1, 1.5, 6);
    purpleRimLight.position.set(-2, 1, -1);
    scene.add(purpleRimLight);

    const cyanRimLight = new THREE.PointLight(0x22C3E6, 1.0, 6);
    cyanRimLight.position.set(2, -1, 1);
    scene.add(cyanRimLight);

    // 3. Ground Shadow Platform
    const shadowGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.05, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x12172F,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(shadowGeo, shadowMat);
    ground.position.y = -1.05;
    scene.add(ground);

    // 4. Pet Character Group
    const petGroup = new THREE.Group();
    petGroupRef.current = petGroup;
    scene.add(petGroup);

    // Body (Cute stylized rounded body)
    const bodyGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const theme = THEME_COLORS[colorTheme] || THEME_COLORS.violet;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: theme.base,
      roughness: 0.35,
      metalness: 0.15,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.name = 'bodyMesh';
    petGroup.add(bodyMesh);

    // Belly Accent
    const bellyGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const bellyMat = new THREE.MeshStandardMaterial({
      color: theme.accent,
      roughness: 0.4,
      metalness: 0.05,
    });
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, -0.15, 0.32);
    bellyMesh.scale.set(0.9, 0.9, 0.4);
    bellyMesh.name = 'bellyMesh';
    petGroup.add(bellyMesh);

    // Big Cute Eyes
    const eyeGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.1 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 0.22, 0.65);
    petGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 0.22, 0.65);
    petGroup.add(rightEye);

    // Specular Eye Highlights (Cute glints)
    const glintGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.22, 0.26, 0.77);
    petGroup.add(leftGlint);

    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.28, 0.26, 0.77);
    petGroup.add(rightGlint);

    // Cute Cheeks (Blush)
    const blushGeo = new THREE.CircleGeometry(0.09, 16);
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xFF6584,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.38, 0.08, 0.66);
    leftBlush.rotation.y = -0.3;
    petGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.38, 0.08, 0.66);
    rightBlush.rotation.y = 0.3;
    petGroup.add(rightBlush);

    // Ears / Little Horns
    const earGeo = new THREE.ConeGeometry(0.22, 0.55, 16);
    const earMat = new THREE.MeshStandardMaterial({
      color: theme.base,
      roughness: 0.4
    });
    
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.48, 0.72, 0);
    leftEar.rotation.z = 0.4;
    leftEar.name = 'leftEar';
    petGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.48, 0.72, 0);
    rightEar.rotation.z = -0.4;
    rightEar.name = 'rightEar';
    petGroup.add(rightEar);

    // Waving Paws / Arms
    const pawGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const pawMat = new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.4 });

    const leftPaw = new THREE.Mesh(pawGeo, pawMat);
    leftPaw.position.set(-0.68, -0.15, 0.2);
    leftPaw.scale.set(0.8, 1.2, 0.8);
    leftPaw.name = 'leftPaw';
    petGroup.add(leftPaw);

    const rightPaw = new THREE.Mesh(pawGeo, pawMat);
    rightPaw.position.set(0.68, -0.15, 0.2);
    rightPaw.scale.set(0.8, 1.2, 0.8);
    rightPaw.name = 'rightPaw';
    petGroup.add(rightPaw);

    // Accessory Subgroups
    const outfitGroup = new THREE.Group();
    outfitGroupRef.current = outfitGroup;
    petGroup.add(outfitGroup);

    const accessoryGroup = new THREE.Group();
    accessoryGroupRef.current = accessoryGroup;
    petGroup.add(accessoryGroup);

    const effectGroup = new THREE.Group();
    effectGroupRef.current = effectGroup;
    petGroup.add(effectGroup);

    // 5. Interactive Mouse Orbit Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      petGroup.rotation.y += deltaX * 0.012;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Intersection Observer to Pause when Off-screen (Phase 2 Requirement)
    let isOffScreen = false;
    const observer = new IntersectionObserver(([entry]) => {
      isOffScreen = !entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    // 7. Render & Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isOffScreen) return; // Pause rendering loop when off-screen!

      const t = clock.getElapsedTime();
      const anim = animStateRef.current;

      // Handle Jump/Hop interaction
      if (anim.isJumping) {
        anim.jumpProgress += 0.07;
        const jumpY = Math.sin(anim.jumpProgress * Math.PI) * 0.55;
        petGroup.position.y = jumpY;
        petGroup.rotation.y += 0.1;
        if (anim.jumpProgress >= 1.0) {
          anim.isJumping = false;
          anim.jumpProgress = 0;
          petGroup.position.y = 0;
        }
      } else {
        // Idle vertical floating bob
        petGroup.position.y = Math.sin(t * 2.2) * 0.07;
        // Idle gentle breathing scale
        const breath = 1.0 + Math.sin(t * 2.2) * 0.025;
        bodyMesh.scale.set(1.0 / breath, breath, 1.0 / breath);
      }

      // Ear sway
      if (leftEar && rightEar) {
        leftEar.rotation.z = 0.4 + Math.sin(t * 3.0) * 0.06;
        rightEar.rotation.z = -0.4 - Math.sin(t * 3.0) * 0.06;
      }

      // Paw wave interaction
      if (anim.waveProgress > 0) {
        anim.waveProgress -= 0.03;
        rightPaw.position.y = 0.35 + Math.sin(t * 15.0) * 0.15;
        rightPaw.rotation.z = -0.8 + Math.sin(t * 15.0) * 0.4;
      } else {
        rightPaw.position.y = -0.15;
        rightPaw.rotation.z = 0;
      }

      // Blinking
      anim.blinkTimer += 0.016;
      if (anim.blinkTimer > 3.6) {
        anim.isBlinking = true;
        leftEye.scale.y = 0.1;
        rightEye.scale.y = 0.1;
        if (anim.blinkTimer > 3.75) {
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
          anim.blinkTimer = 0;
          anim.isBlinking = false;
        }
      }

      // Effect animations (rotating aura, stars)
      if (effectGroupRef.current) {
        effectGroupRef.current.rotation.y = t * 0.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 300;
      const newH = container.clientHeight || 340;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Color Theme
  useEffect(() => {
    if (!petGroupRef.current) return;
    const theme = THEME_COLORS[colorTheme] || THEME_COLORS.violet;
    const body = petGroupRef.current.getObjectByName('bodyMesh');
    const belly = petGroupRef.current.getObjectByName('bellyMesh');
    const leftEar = petGroupRef.current.getObjectByName('leftEar');
    const rightEar = petGroupRef.current.getObjectByName('rightEar');
    const leftPaw = petGroupRef.current.getObjectByName('leftPaw');
    const rightPaw = petGroupRef.current.getObjectByName('rightPaw');

    if (body) body.material.color.setHex(theme.base);
    if (belly) belly.material.color.setHex(theme.accent);
    if (leftEar) leftEar.material.color.setHex(theme.base);
    if (rightEar) rightEar.material.color.setHex(theme.base);
    if (leftPaw) leftPaw.material.color.setHex(theme.accent);
    if (rightPaw) rightPaw.material.color.setHex(theme.accent);
  }, [colorTheme]);

  // Update Equipped Outfit in 3D Scene
  useEffect(() => {
    const group = outfitGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!equippedOutfit) return;

    if (equippedOutfit === 'outfit_scholar') {
      // Scholar Robe (Cowl around torso with gold collar)
      const collarGeo = new THREE.TorusGeometry(0.68, 0.12, 16, 32);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0x382894, roughness: 0.3 });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = -0.05;
      group.add(collar);

      const trimGeo = new THREE.TorusGeometry(0.69, 0.03, 16, 32);
      const trimMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = -0.04;
      group.add(trim);
    } else if (equippedOutfit === 'outfit_cyber') {
      // Cyber Hoodie (Neon trims)
      const hoodGeo = new THREE.TorusGeometry(0.72, 0.14, 16, 32);
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x12172F, roughness: 0.2 });
      const hood = new THREE.Mesh(hoodGeo, hoodMat);
      hood.rotation.x = Math.PI / 2;
      hood.position.y = -0.05;
      group.add(hood);

      const neonGeo = new THREE.RingGeometry(0.68, 0.74, 32);
      const neonMat = new THREE.MeshBasicMaterial({ color: 0x22C3E6, side: THREE.DoubleSide });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.rotation.x = Math.PI / 2;
      neon.position.y = -0.15;
      group.add(neon);
    } else if (equippedOutfit === 'outfit_hero' || equippedOutfit === 'outfit_master') {
      // Flowing Hero Cape
      const capeGeo = new THREE.PlaneGeometry(0.9, 1.1, 8, 8);
      const capeColor = equippedOutfit === 'outfit_hero' ? 0xD93636 : 0x6C4CF1;
      const capeMat = new THREE.MeshStandardMaterial({
        color: capeColor,
        side: THREE.DoubleSide,
        roughness: 0.3
      });
      const cape = new THREE.Mesh(capeGeo, capeMat);
      cape.position.set(0, -0.3, -0.72);
      cape.rotation.x = 0.25;
      group.add(cape);
    }
  }, [equippedOutfit]);

  // Update Equipped Accessory in 3D Scene
  useEffect(() => {
    const group = accessoryGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!equippedAccessory) return;

    if (equippedAccessory === 'acc_wizard_hat') {
      // Wizard Hat
      const coneGeo = new THREE.ConeGeometry(0.38, 0.75, 24);
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x281A66, roughness: 0.3 });
      const cone = new THREE.Mesh(coneGeo, hatMat);
      cone.position.set(0, 1.05, 0.05);
      cone.rotation.x = -0.15;
      group.add(cone);

      const brimGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.04, 24);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.set(0, 0.72, 0);
      group.add(brim);

      // Star on hat
      const starGeo = new THREE.OctahedronGeometry(0.08);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(0, 1.1, 0.22);
      group.add(star);
    } else if (equippedAccessory === 'acc_sunglasses') {
      // Cool Shades
      const frameGeo = new THREE.BoxGeometry(0.72, 0.16, 0.08);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.1 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0.24, 0.72);
      group.add(frame);

      const lensGeo = new THREE.PlaneGeometry(0.28, 0.12);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x22C3E6, transparent: true, opacity: 0.85 });
      const leftLens = new THREE.Mesh(lensGeo, lensMat);
      leftLens.position.set(-0.18, 0.24, 0.77);
      group.add(leftLens);
      const rightLens = new THREE.Mesh(lensGeo, lensMat);
      rightLens.position.set(0.18, 0.24, 0.77);
      group.add(rightLens);
    } else if (equippedAccessory === 'acc_headphones') {
      // Studio Headphones
      const bandGeo = new THREE.TorusGeometry(0.76, 0.06, 16, 32, Math.PI);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x1E2347, roughness: 0.3 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 0.2, 0);
      group.add(band);

      const cupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0x6C4CF1, roughness: 0.2 });
      const leftCup = new THREE.Mesh(cupGeo, cupMat);
      leftCup.rotation.z = Math.PI / 2;
      leftCup.position.set(-0.76, 0.2, 0);
      group.add(leftCup);
      const rightCup = new THREE.Mesh(cupGeo, cupMat);
      rightCup.rotation.z = Math.PI / 2;
      rightCup.position.set(0.76, 0.2, 0);
      group.add(rightCup);
    } else if (equippedAccessory === 'acc_scarf') {
      // Cozy Scarf
      const scarfGeo = new THREE.TorusGeometry(0.68, 0.12, 16, 32);
      const scarfMat = new THREE.MeshStandardMaterial({ color: 0xF5A524, roughness: 0.5 });
      const scarf = new THREE.Mesh(scarfGeo, scarfMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.set(0, -0.15, 0);
      group.add(scarf);
    } else if (equippedAccessory === 'acc_halo') {
      // Golden Halo
      const haloGeo = new THREE.TorusGeometry(0.48, 0.05, 16, 32);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xFFE066 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 1.15, 0);
      group.add(halo);
    }
  }, [equippedAccessory]);

  // Update Visual Effects in 3D Scene
  useEffect(() => {
    const group = effectGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!equippedEffect) return;

    if (equippedEffect === 'effect_sparkles') {
      // Orbiting Golden & Violet Stars
      const starGeo = new THREE.OctahedronGeometry(0.065);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      for (let i = 0; i < 6; i++) {
        const star = new THREE.Mesh(starGeo, starMat);
        const angle = (i / 6) * Math.PI * 2;
        star.position.set(Math.cos(angle) * 1.15, (i % 2 === 0 ? 0.3 : -0.2), Math.sin(angle) * 1.15);
        group.add(star);
      }
    } else if (equippedEffect === 'effect_aura') {
      // Radiant Glowing Aura Shell
      const auraGeo = new THREE.SphereGeometry(1.05, 24, 24);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x22C3E6,
        transparent: true,
        opacity: 0.25,
        wireframe: true
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      group.add(aura);
    } else if (equippedEffect === 'effect_trail') {
      // Starlight Particle Dust
      const dustGeo = new THREE.DodecahedronGeometry(0.05);
      const dustMat = new THREE.MeshBasicMaterial({ color: 0xE040FB });
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(dustGeo, dustMat);
        p.position.set(
          (Math.random() - 0.5) * 1.6,
          -0.6 + Math.random() * 0.9,
          (Math.random() - 0.5) * 1.6
        );
        group.add(p);
      }
    }
  }, [equippedEffect]);

  // Click / Tap Handler: Trigger wave or happy jump animation
  const handlePetClick = () => {
    if (!interactive) return;
    setIsInteracting(true);
    const anim = animStateRef.current;

    // Alternate between happy jump and cheerful wave
    if (Math.random() > 0.4) {
      anim.isJumping = true;
      anim.jumpProgress = 0;
    } else {
      anim.waveProgress = 1.0;
    }

    if (onInteract) onInteract();
    setTimeout(() => setIsInteracting(false), 900);
  };

  return (
    <div
      ref={mountRef}
      onClick={handlePetClick}
      className={`relative w-full rounded-2xl overflow-hidden select-none cursor-pointer group transition-all`}
      style={{ height }}
      title="Click or tap to play with your MirrorPet!"
    >
      {/* Interactive Helper Overlay */}
      <div className="absolute bottom-2.5 right-3 text-[11px] font-semibold text-light-subtle/80 bg-[#0F1226]/80 px-2.5 py-1 rounded-full border border-[#292E56] pointer-events-none group-hover:text-[#22C3E6] transition-colors">
        ✨ Tap to play • Drag to rotate
      </div>
    </div>
  );
}
