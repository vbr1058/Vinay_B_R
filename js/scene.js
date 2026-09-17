/**
 * Hero 3D scene — a neural-network constellation.
 * Nodes scattered in a flattened sphere, linked to near neighbours.
 * - Gently rotates; tilts toward the pointer; drifts with scroll.
 * - Mobile: fewer nodes, capped pixel ratio, no antialiasing, no parallax.
 * - prefers-reduced-motion: renders a single static frame.
 * - Pauses whenever the hero is scrolled out of view or the tab is hidden.
 */
import * as THREE from "three";

const canvas = document.getElementById("scene");
const hero = document.getElementById("hero");
if (canvas && hero) init();

function init() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const nodeCount = isMobile ? 70 : 150;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  // ---- Build the network (deterministic so it looks the same every load) ----
  const rng = mulberry32(42);
  const pts = [];
  const positions = new Float32Array(nodeCount * 3);
  for (let i = 0; i < nodeCount; i++) {
    const v = new THREE.Vector3(rng() * 2 - 1, (rng() * 2 - 1) * 0.72, rng() * 2 - 1);
    v.normalize().multiplyScalar(0.55 + Math.cbrt(rng()) * 1.85);
    pts.push(v);
    positions.set([v.x, v.y, v.z], i * 3);
  }

  const linePts = [];
  const seen = new Set();
  const MAX_DIST = 1.05, MAX_LINKS = 3;
  for (let i = 0; i < nodeCount; i++) {
    const near = [];
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const d = pts[i].distanceTo(pts[j]);
      if (d < MAX_DIST) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (const { j } of near.slice(0, MAX_LINKS)) {
      const key = i < j ? i + "-" + j : j + "-" + i;
      if (seen.has(key)) continue;
      seen.add(key);
      linePts.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
    }
  }

  const group = new THREE.Group();

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.05,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePts), 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    transparent: true,
    depthWrite: false,
  }));
  group.add(lines);
  scene.add(group);

  // ---- Theme-aware colours ----
  function applyThemeColors() {
    const light = document.documentElement.classList.contains("light");
    if (light) {
      pMat.color.set("#0e7490");
      pMat.opacity = 0.85;
      pMat.blending = THREE.NormalBlending;
      lines.material.color.set("#0891b2");
      lines.material.opacity = 0.28;
      lines.material.blending = THREE.NormalBlending;
    } else {
      pMat.color.set("#67e8f9");
      pMat.opacity = 0.95;
      pMat.blending = THREE.AdditiveBlending;
      lines.material.color.set("#22d3ee");
      lines.material.opacity = 0.16;
      lines.material.blending = THREE.AdditiveBlending;
    }
    pMat.needsUpdate = true;
    lines.material.needsUpdate = true;
  }
  applyThemeColors();
  window.addEventListener("themechange", () => {
    applyThemeColors();
    if (reducedMotion) renderer.render(scene, camera);
  });

  // ---- Sizing ----
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- Pointer parallax (desktop only) ----
  const pointer = { x: 0, y: 0 };
  if (!isMobile && !reducedMotion) {
    window.addEventListener("pointermove", (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }

  // ---- Render loop, paused when hero is offscreen ----
  let heroVisible = true;
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
  }).observe(hero);

  if (reducedMotion) {
    group.rotation.set(0.18, 0.6, 0);
    renderer.render(scene, camera);
    return;
  }

  const clock = new THREE.Clock();
  let scrollLerp = 0;

  renderer.setAnimationLoop(() => {
    if (!heroVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    group.rotation.y += dt * 0.07;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, pointer.y * 0.22, 0.04);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, -pointer.x * 0.12, 0.04);

    scrollLerp = THREE.MathUtils.lerp(scrollLerp, window.scrollY, 0.06);
    group.position.y = scrollLerp * 0.0009;

    pMat.size = 0.05 + Math.sin(t * 1.4) * 0.008;
    group.position.x = Math.sin(t * 0.3) * 0.05;

    renderer.render(scene, camera);
  });
}

// Deterministic PRNG
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
