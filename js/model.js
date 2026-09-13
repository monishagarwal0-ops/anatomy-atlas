import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SYSTEMS } from "./data/organs.js";

const MODEL_URL = "assets/model/scene.gltf";
const TARGET_HEIGHT = 5.4; // world units — matches the camera/lighting rig

function systemColor(key) {
  return new THREE.Color(SYSTEMS[key].color);
}

// Each hotspot is placed as a FRACTION of the model's own bounding box,
// so it lands correctly regardless of the exact scan's proportions:
//   yFrac: 0 = sole of the feet, 1 = crown of the head
//   xFrac: -1..1, a fraction of the half-width (sign = left/right)
//   zFrac: -1..1, a fraction of the half-depth (+ = front/chest side)
// This model stands in a T-pose, so the two arm-related hotspots sit
// far out along x at shoulder height rather than hanging at the sides.
const HOTSPOTS = [
  { id: "brain", yFrac: 0.965, xFrac: 0.0, zFrac: 0.3, system: "nervous" },
  { id: "skull", yFrac: 0.96, xFrac: 0.0, zFrac: -0.45, system: "musculoskeletal" },
  { id: "spinalCord", yFrac: 0.78, xFrac: 0.0, zFrac: -0.8, system: "nervous" },

  { id: "heart", yFrac: 0.72, xFrac: -0.12, zFrac: 0.6, system: "circulatory" },
  { id: "aorta", yFrac: 0.76, xFrac: 0.05, zFrac: -0.15, system: "circulatory" },
  { id: "venaCava", yFrac: 0.8, xFrac: 0.13, zFrac: 0.3, system: "circulatory" },

  { id: "lungs", yFrac: 0.735, xFrac: -0.33, zFrac: 0.45, system: "respiratory" },
  { id: "lungs", yFrac: 0.735, xFrac: 0.33, zFrac: 0.45, system: "respiratory" },
  { id: "trachea", yFrac: 0.83, xFrac: 0.0, zFrac: 0.55, system: "respiratory" },
  { id: "diaphragm", yFrac: 0.65, xFrac: 0.0, zFrac: 0.25, system: "respiratory" },

  { id: "stomach", yFrac: 0.6, xFrac: -0.22, zFrac: 0.6, system: "digestive" },
  { id: "liver", yFrac: 0.63, xFrac: 0.25, zFrac: 0.55, system: "digestive" },
  { id: "pancreas", yFrac: 0.6, xFrac: 0.0, zFrac: -0.15, system: "digestive" },
  { id: "smallIntestine", yFrac: 0.51, xFrac: 0.0, zFrac: 0.55, system: "digestive" },
  { id: "largeIntestine", yFrac: 0.55, xFrac: 0.0, zFrac: 0.5, system: "digestive" },
  { id: "kidneys", yFrac: 0.58, xFrac: -0.3, zFrac: -0.45, system: "digestive" },
  { id: "kidneys", yFrac: 0.58, xFrac: 0.3, zFrac: -0.45, system: "digestive" },

  { id: "spleen", yFrac: 0.61, xFrac: -0.4, zFrac: -0.2, system: "immune" },
  { id: "thymus", yFrac: 0.77, xFrac: 0.0, zFrac: 0.6, system: "immune" },
  { id: "lymphNodes", yFrac: 0.84, xFrac: 0.16, zFrac: 0.3, system: "immune" },

  { id: "vertebralColumn", yFrac: 0.65, xFrac: 0.0, zFrac: -0.85, system: "musculoskeletal" },
  { id: "ribCage", yFrac: 0.7, xFrac: 0.32, zFrac: 0.3, system: "musculoskeletal" },
  { id: "pelvis", yFrac: 0.47, xFrac: 0.22, zFrac: 0.0, system: "musculoskeletal" },
  { id: "skeletalMuscle", yFrac: 0.78, xFrac: 0.9, zFrac: 0.0, system: "musculoskeletal" },

  { id: "skin", yFrac: 0.78, xFrac: -0.9, zFrac: 0.0, system: "integumentary" },
];

function makePin(system) {
  const color = systemColor(system);
  const geo = new THREE.SphereGeometry(0.052, 16, 12);
  const mat = new THREE.MeshBasicMaterial({
    color,
    depthTest: false, // pins always read through the body, like map markers
    transparent: true,
    opacity: 0, // dots hidden — still clickable, just invisible
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;

  // a thin white halo ring so the pin reads clearly against any body colour
  const haloGeo = new THREE.RingGeometry(0.058, 0.074, 20);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0, // hidden along with the pin
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.renderOrder = 998;
  mesh.add(halo);

  mesh.userData.halo = halo;
  return mesh;
}

/**
 * Loads the scanned anatomy model, normalises its scale/position, and
 * scatters clickable hotspot pins over it. Returns a promise resolving to
 * { root, pins, meshesById, credit }.
 */
export function loadHumanModel() {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;

        // give every material a touch less shine — this is a matte
        // anatomical surface, not a plastic figurine
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.roughness = 0.75;
            child.material.metalness = 0.0;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = TARGET_HEIGHT / size.y;

        model.scale.setScalar(scale);

        // recompute the box after scaling, then sit it on the ground
        // and centre it on the x/z origin
        const box2 = new THREE.Box3().setFromObject(model);
        const size2 = new THREE.Vector3();
        box2.getSize(size2);
        const center2 = new THREE.Vector3();
        box2.getCenter(center2);

        model.position.x -= center2.x;
        model.position.z -= center2.z;
        model.position.y -= box2.min.y;

        const root = new THREE.Group();
        root.add(model);

        // final bounding box, in root-local space, used for hotspot maths
        const finalBox = new THREE.Box3().setFromObject(model);
        const height = finalBox.max.y - finalBox.min.y;
        const width = finalBox.max.x - finalBox.min.x;
        const depth = finalBox.max.z - finalBox.min.z;
        const cx = (finalBox.max.x + finalBox.min.x) / 2;
        const cz = (finalBox.max.z + finalBox.min.z) / 2;

        const pins = [];
        const meshesById = {};

        HOTSPOTS.forEach((h) => {
          const pin = makePin(h.system);
          pin.position.set(
            cx + h.xFrac * (width / 2),
            finalBox.min.y + h.yFrac * height,
            cz + h.zFrac * (depth / 2)
          );
          pin.userData.organId = h.id;
          root.add(pin);
          pins.push(pin);
          meshesById[h.id] = meshesById[h.id] || [];
          meshesById[h.id].push(pin);
        });

        resolve({
          root,
          pins,
          meshesById,
          modelHeight: height,
          credit: {
            title: "human antomy",
            author: "rickkeditz37",
            authorUrl: "https://sketchfab.com/rickkeditz37",
            sourceUrl:
              "https://sketchfab.com/3d-models/human-antomy-3981daabb62b4e198d3606607055901a",
            license: "CC BY 4.0",
            licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
          },
        });
      },
      undefined,
      (err) => reject(err)
    );
  });
}
