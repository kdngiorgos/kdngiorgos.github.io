import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }     from 'three/addons/postprocessing/OutputPass.js';

const PRM    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_MOB = window.innerWidth < 768;

const CONFIGS = [
  { geo: () => new THREE.IcosahedronGeometry(1.1, 1),           pos: [ 3.2,  1.2, -0.5], speed: 0.10, wOp: 0.55 },
  { geo: () => new THREE.DodecahedronGeometry(0.75, 0),         pos: [-3.2, -0.8, -1.5], speed: 0.13, wOp: 0.45 },
  { geo: () => new THREE.OctahedronGeometry(0.6, 1),            pos: [ 1.5, -2.8, -2.0], speed: 0.18, wOp: 0.40 },
  { geo: () => new THREE.TorusKnotGeometry(0.45, 0.18, 80, 16), pos: [-2.5,  2.0, -1.0], speed: 0.08, wOp: 0.60 },
  { geo: () => new THREE.IcosahedronGeometry(0.45, 0),          pos: [ 4.2, -1.2,  0.5], speed: 0.22, wOp: 0.35 },
  { geo: () => new THREE.OctahedronGeometry(0.35, 0),           pos: [-3.8,  0.8,  0.2], speed: 0.16, wOp: 0.30 },
];

export function initScene(canvas) {
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOB, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOB ? 1 : 2));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 100);
  camera.position.z = 8;

  scene.add(new THREE.AmbientLight(0x0d0d1a, 2.5));

  const vLight = new THREE.PointLight(0x7c5cff, 10, 30);
  vLight.position.set(4, 3, 4);
  scene.add(vLight);

  const aLight = new THREE.PointLight(0xffb86b, 6, 24);
  aLight.position.set(-4, -2, 3);
  scene.add(aLight);

  const count   = IS_MOB ? 3 : CONFIGS.length;
  const objects = [];

  for (let i = 0; i < count; i++) {
    const { geo, pos, speed, wOp } = CONFIGS[i];
    const g = geo();

    const solid = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      color: 0x111120,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x07050f,
      emissiveIntensity: 0.5,
    }));

    const wire = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0x7c5cff,
      wireframe: true,
      transparent: true,
      opacity: wOp,
    }));

    solid.position.set(...pos);
    wire.position.set(...pos);
    scene.add(solid, wire);
    objects.push({ solid, wire, pos, speed, phase: i * 1.3 });
  }

  let composer = null;
  if (!IS_MOB) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.4, 0.5, 0.78);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const mouse  = { x: 0, y: 0 };
  const camPos = { x: 0, y: 0 };

  if (!PRM && !IS_MOB) {
    window.addEventListener('mousemove', e => {
      mouse.x =  (e.clientX / W() - 0.5) * 1.6;
      mouse.y = -(e.clientY / H() - 0.5) * 1.0;
    }, { passive: true });
  }

  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    if (composer) composer.setSize(W(), H());
  }, { passive: true });

  const clock = new THREE.Clock();
  let raf;

  if (PRM) {
    renderer.render(scene, camera);
    return () => {};
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    for (const obj of objects) {
      obj.solid.rotation.x = t * obj.speed * 0.65;
      obj.solid.rotation.y = t * obj.speed;
      obj.solid.position.y = obj.pos[1] + Math.sin(t * 0.35 + obj.phase) * 0.28;
      obj.wire.rotation.copy(obj.solid.rotation);
      obj.wire.position.copy(obj.solid.position);
    }

    vLight.position.x = Math.cos(t * 0.28) * 5;
    vLight.position.y = Math.sin(t * 0.19) * 4;
    aLight.position.x = Math.cos(t * 0.19 + Math.PI) * 4.5;
    aLight.position.y = Math.sin(t * 0.28 + 1.0) * 3.5;

    camPos.x += (mouse.x - camPos.x) * 0.045;
    camPos.y += (mouse.y - camPos.y) * 0.045;
    camera.position.x = camPos.x;
    camera.position.y = camPos.y;
    camera.lookAt(0, 0, 0);

    composer ? composer.render() : renderer.render(scene, camera);
  }

  tick();
  return () => { cancelAnimationFrame(raf); renderer.dispose(); };
}
