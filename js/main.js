import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadHumanModel } from "./model.js";
import { ORGANS, SYSTEMS } from "./data/organs.js";
import {
  initHamburger,
  initAbout,
  setActiveNav,
  renderLegend,
  showInfo,
  clearInfo,
  initInfoClose,
  hideLoading,
  setCredit,
} from "./ui.js";

// ------------------------------------------------------------------
// Scene / renderer / camera
// ------------------------------------------------------------------
const canvas = document.getElementById("scene-canvas");
const stage = canvas.parentElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.Fog(0xffffff, 10, 18);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(2.6, 4.0, 5.6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

// ------------------------------------------------------------------
// Lighting — bright, even, studio-style for a white backdrop
// ------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const key = new THREE.DirectionalLight(0xffffff, 1.05);
key.position.set(3, 6, 4);
scene.add(key);

const fill = new THREE.DirectionalLight(0xdfe9f2, 0.55);
fill.position.set(-4, 2, -2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(0, 5, -4);
scene.add(rim);

// ground disc — soft neutral, with a thin crimson ring for grounding
const disc = new THREE.Mesh(
  new THREE.CircleGeometry(1.9, 48),
  new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.95 })
);
disc.rotation.x = -Math.PI / 2;
scene.add(disc);

const groundRing = new THREE.Mesh(
  new THREE.RingGeometry(1.86, 1.9, 64),
  new THREE.MeshBasicMaterial({ color: 0x9c3b3b, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
);
groundRing.rotation.x = -Math.PI / 2;
groundRing.position.y = 0.003;
scene.add(groundRing);

// ------------------------------------------------------------------
// Controls — orbit freely, but keep turning on its own when idle
// ------------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.4;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI * 0.53;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.4;
controls.update();

// ------------------------------------------------------------------
// The scanned figure + its hotspot pins (loads asynchronously)
// ------------------------------------------------------------------
let human = null; // { root, pins, meshesById, credit }
let activeSystem = null;
let selectedId = null;

const HIGHLIGHT_SCALE = 1.6;
const DIM_OPACITY = 0.25;

function refreshVisualState() {
  if (!human) return;
  human.pins.forEach((pin) => {
    const id = pin.userData.organId;
    const organ = ORGANS[id];
    const matchesSystem = !activeSystem || (organ && organ.system === activeSystem);
    const isSelected = id === selectedId;

    pin.material.opacity = matchesSystem ? 0.95 : DIM_OPACITY;
    pin.userData.halo.material.opacity = matchesSystem ? 0.85 : DIM_OPACITY * 0.8;

    const targetScale = isSelected ? HIGHLIGHT_SCALE : 1;
    pin.userData.targetScale = targetScale;
  });
}

// ------------------------------------------------------------------
// Raycasting / selection
// ------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = null;

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (event.clientX ?? event.touches?.[0]?.clientX) - rect.left;
  const y = (event.clientY ?? event.touches?.[0]?.clientY) - rect.top;
  pointer.x = (x / rect.width) * 2 - 1;
  pointer.y = -(y / rect.height) * 2 + 1;
}

function pickAt(event) {
  if (!human) return null;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(human.pins, false);
  return hits[0]?.object ?? null;
}

function selectOrgan(id) {
  selectedId = id;
  if (!id) {
    clearInfo();
  } else {
    showInfo(ORGANS[id]);
  }
  refreshVisualState();
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener("pointerup", (e) => {
  if (!pointerDownPos) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  pointerDownPos = null;
  if (Math.hypot(dx, dy) > 6) return; // a drag/orbit, not a click

  const hit = pickAt(e);
  selectOrgan(hit?.userData.organId ?? null);
});

renderer.domElement.addEventListener("pointermove", (e) => {
  const hit = pickAt(e);
  renderer.domElement.style.cursor = hit ? "pointer" : "grab";
});

initInfoClose(() => selectOrgan(null));

// ------------------------------------------------------------------
// Nav: system focus + About + Home
// ------------------------------------------------------------------
const FOCUS = {
  circulatory: { y: 4.0, distance: 3.1 },
  respiratory: { y: 4.05, distance: 3.1 },
  nervous: { y: 5.0, distance: 2.7 },
  digestive: { y: 3.3, distance: 3.2 },
  musculoskeletal: { y: 3.5, distance: 4.6 },
  immune: { y: 3.95, distance: 3.3 },
};
const HOME_FOCUS = { y: 3.4, distance: 5.6 };

let desiredTargetY = HOME_FOCUS.y;
let desiredDistance = HOME_FOCUS.distance;

function applyFocus(focus, systemKey) {
  desiredTargetY = focus.y;
  desiredDistance = focus.distance;
  activeSystem = systemKey;
  renderLegend(systemKey ? [systemKey] : Object.keys(SYSTEMS).filter((k) => k !== "integumentary"));
  refreshVisualState();
}

document.querySelectorAll(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectOrgan(null);
    if (btn.dataset.action === "about") {
      about.open();
      return;
    }
    if (btn.dataset.action === "home") {
      setActiveNav("home");
      applyFocus(HOME_FOCUS, null);
      return;
    }
    const key = btn.dataset.system;
    if (key) {
      setActiveNav(key);
      applyFocus(FOCUS[key], key);
    }
  });
});

initHamburger();
const about = initAbout();
renderLegend(Object.keys(SYSTEMS).filter((k) => k !== "integumentary"));

// ------------------------------------------------------------------
// Load the figure
// ------------------------------------------------------------------
loadHumanModel()
  .then((result) => {
    human = result;
    scene.add(human.root);
    setCredit(human.credit);
    refreshVisualState();
    hideLoading();
  })
  .catch((err) => {
    console.error("Failed to load the anatomy model:", err);
    document.getElementById("stage-loading").textContent =
      "Couldn't load the 3D model — check your connection and reload.";
  });

// ------------------------------------------------------------------
// Animation loop
// ------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  const currentDistance = dir.length();
  const lerpedY = THREE.MathUtils.lerp(controls.target.y, desiredTargetY, 0.05);
  const lerpedDistance = THREE.MathUtils.lerp(currentDistance, desiredDistance, 0.05);
  controls.target.y = lerpedY;
  dir.normalize().multiplyScalar(lerpedDistance);
  camera.position.copy(controls.target).add(dir);

  if (human) {
    human.pins.forEach((pin) => {
      const target = pin.userData.targetScale ?? 1;
      const s = THREE.MathUtils.lerp(pin.scale.x, target, 0.2);
      pin.scale.setScalar(s);
    });
  }

  controls.update();
  renderer.render(scene, camera);
}

resize();
animate();
