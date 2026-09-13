import * as THREE from "three";
import { SYSTEMS } from "./data/organs.js";

const SKIN_COLOR = 0xd8b48c;
const MUSCLE_COLOR = 0x9c3b3b;
const BONE_COLOR = 0xc9bfa0;

function hex(str) {
  return new THREE.Color(str);
}

function systemColor(key) {
  return hex(SYSTEMS[key].color);
}

function stdMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.02,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    ...opts.extra,
  });
}

function capsule(radius, length, color, opts) {
  const geo = new THREE.CapsuleGeometry(radius, length, 6, 12);
  return new THREE.Mesh(geo, stdMat(color, opts));
}

function ball(radius, color, opts) {
  const geo = new THREE.SphereGeometry(radius, 20, 16);
  return new THREE.Mesh(geo, stdMat(color, opts));
}

function blob(radius, scaleXYZ, color, opts) {
  const m = ball(radius, color, opts);
  m.scale.set(...scaleXYZ);
  return m;
}

function ring(radius, tube, color, opts) {
  const geo = new THREE.TorusGeometry(radius, tube, 10, 28);
  const mesh = new THREE.Mesh(geo, stdMat(color, opts));
  mesh.rotation.x = Math.PI / 2; // lie flat, horizontal ring
  return mesh;
}

function tube(points, radius, color, opts) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 24, radius, 8, false);
  return new THREE.Mesh(geo, stdMat(color, opts));
}

/**
 * Builds the whole figure. Returns groups + a lookup of clickable
 * meshes per layer, so main.js only has to raycast the active set.
 */
export function buildHuman() {
  const root = new THREE.Group();

  const skinGroup = new THREE.Group();
  const muscleGroup = new THREE.Group();
  const organGroup = new THREE.Group();
  const boneGroup = new THREE.Group();
  root.add(skinGroup, muscleGroup, organGroup, boneGroup);

  const clickableByLayer = { 0: [], 1: [], 2: [], 3: [] };
  const meshesById = {};

  function tag(mesh, id, layerIndex) {
    mesh.userData.organId = id;
    mesh.castShadow = false;
    clickableByLayer[layerIndex].push(mesh);
    meshesById[id] = meshesById[id] || [];
    meshesById[id].push(mesh);
    return mesh;
  }

  // ---------------------------------------------------------
  // SKIN — the outer silhouette (visible on layer 0)
  // ---------------------------------------------------------
  const skinOpts = { transparent: true, opacity: 1 };

  const head = ball(0.32, SKIN_COLOR, skinOpts);
  head.position.set(0, 5.17, 0);
  skinGroup.add(head);

  const neck = capsule(0.14, 0.18, SKIN_COLOR, skinOpts);
  neck.position.set(0, 4.75, 0);
  skinGroup.add(neck);

  const chest = capsule(0.5, 0.85, SKIN_COLOR, skinOpts);
  chest.position.set(0, 4.15, 0);
  skinGroup.add(chest);

  const abdomen = capsule(0.42, 0.45, SKIN_COLOR, skinOpts);
  abdomen.position.set(0, 3.35, 0);
  skinGroup.add(abdomen);

  const pelvis = capsule(0.44, 0.3, SKIN_COLOR, skinOpts);
  pelvis.position.set(0, 2.85, 0);
  skinGroup.add(pelvis);

  [-1, 1].forEach((side) => {
    const upperArm = capsule(0.13, 0.85, SKIN_COLOR, skinOpts);
    upperArm.position.set(side * 0.66, 4.0, 0);
    skinGroup.add(upperArm);

    const forearm = capsule(0.11, 0.75, SKIN_COLOR, skinOpts);
    forearm.position.set(side * 0.66, 3.05, 0);
    skinGroup.add(forearm);

    const hand = blob(0.12, [0.8, 1.3, 0.6], SKIN_COLOR, skinOpts);
    hand.position.set(side * 0.66, 2.42, 0);
    skinGroup.add(hand);

    const thigh = capsule(0.21, 1.05, SKIN_COLOR, skinOpts);
    thigh.position.set(side * 0.26, 1.95, 0);
    skinGroup.add(thigh);

    const shin = capsule(0.15, 1.0, SKIN_COLOR, skinOpts);
    shin.position.set(side * 0.26, 0.75, 0);
    skinGroup.add(shin);

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.14, 0.42),
      stdMat(SKIN_COLOR, skinOpts)
    );
    foot.position.set(side * 0.26, 0.07, 0.12);
    skinGroup.add(foot);
  });

  // a single representative "Skin" hotspot — a subtle patch on the forearm
  const skinPatch = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 16, 12),
    stdMat(SKIN_COLOR, { transparent: true, opacity: 1 })
  );
  skinPatch.position.set(0.66, 3.05, 0.1);
  skinGroup.add(skinPatch);
  tag(skinPatch, "skin", 0);

  // ---------------------------------------------------------
  // MUSCLE — recoloured torso/limbs (visible on layer 1) +
  // one explicit "Skeletal Muscle" hotspot (the bicep)
  // ---------------------------------------------------------
  const muscleOpts = { transparent: true, opacity: 1 };
  const muscleBody = new THREE.Group();
  [
    ["sphere", 0.315, [0, 5.17, 0]],
    ["capsule14x18", 0.14, 0.18, [0, 4.75, 0]],
    ["capsule5x85", 0.5, 0.85, [0, 4.15, 0]],
    ["capsule42x45", 0.42, 0.45, [0, 3.35, 0]],
    ["capsule44x30", 0.44, 0.3, [0, 2.85, 0]],
  ];
  const mHead = ball(0.315, MUSCLE_COLOR, muscleOpts);
  mHead.position.set(0, 5.17, 0);
  muscleBody.add(mHead);
  const mNeck = capsule(0.14, 0.18, MUSCLE_COLOR, muscleOpts);
  mNeck.position.set(0, 4.75, 0);
  muscleBody.add(mNeck);
  const mChest = capsule(0.5, 0.85, MUSCLE_COLOR, muscleOpts);
  mChest.position.set(0, 4.15, 0);
  muscleBody.add(mChest);
  const mAbdomen = capsule(0.42, 0.45, MUSCLE_COLOR, muscleOpts);
  mAbdomen.position.set(0, 3.35, 0);
  muscleBody.add(mAbdomen);
  const mPelvis = capsule(0.44, 0.3, MUSCLE_COLOR, muscleOpts);
  mPelvis.position.set(0, 2.85, 0);
  muscleBody.add(mPelvis);

  [-1, 1].forEach((side) => {
    const upperArm = capsule(0.13, 0.85, MUSCLE_COLOR, muscleOpts);
    upperArm.position.set(side * 0.66, 4.0, 0);
    muscleBody.add(upperArm);
    const forearm = capsule(0.11, 0.75, MUSCLE_COLOR, muscleOpts);
    forearm.position.set(side * 0.66, 3.05, 0);
    muscleBody.add(forearm);
    const hand = blob(0.12, [0.8, 1.3, 0.6], MUSCLE_COLOR, muscleOpts);
    hand.position.set(side * 0.66, 2.42, 0);
    muscleBody.add(hand);
    const thigh = capsule(0.21, 1.05, MUSCLE_COLOR, muscleOpts);
    thigh.position.set(side * 0.26, 1.95, 0);
    muscleBody.add(thigh);
    const shin = capsule(0.15, 1.0, MUSCLE_COLOR, muscleOpts);
    shin.position.set(side * 0.26, 0.75, 0);
    muscleBody.add(shin);
  });
  muscleGroup.add(muscleBody);

  const bicep = blob(0.155, [1, 1.25, 1], hex(SYSTEMS.musculoskeletal.color), {
    transparent: true,
    opacity: 1,
  });
  bicep.material.color.set(0xb5473f);
  bicep.position.set(0.685, 4.18, 0.06);
  muscleGroup.add(bicep);
  tag(bicep, "skeletalMuscle", 1);

  // ---------------------------------------------------------
  // ORGANS — visible on layer 2
  // ---------------------------------------------------------
  const heart = blob(0.19, [1, 1.15, 0.85], systemColor("circulatory"), {});
  heart.position.set(-0.1, 4.05, 0.18);
  organGroup.add(heart);
  tag(heart, "heart", 2);

  const aorta = tube(
    [
      new THREE.Vector3(-0.06, 4.25, 0.1),
      new THREE.Vector3(0.02, 4.5, -0.05),
      new THREE.Vector3(0.05, 4.0, -0.15),
      new THREE.Vector3(0.02, 3.3, -0.12),
    ],
    0.045,
    systemColor("circulatory"),
    {}
  );
  organGroup.add(aorta);
  tag(aorta, "aorta", 2);

  const venaCava = tube(
    [
      new THREE.Vector3(0.14, 4.55, 0.05),
      new THREE.Vector3(0.1, 4.3, 0.1),
      new THREE.Vector3(0.05, 4.0, 0.15),
    ],
    0.05,
    systemColor("circulatory"),
    {}
  );
  organGroup.add(venaCava);
  tag(venaCava, "venaCava", 2);

  [-1, 1].forEach((side) => {
    const lung = blob(0.24, [0.85, 1.3, 0.7], systemColor("respiratory"), {});
    lung.position.set(side * 0.32, 4.15, 0.02);
    organGroup.add(lung);
    tag(lung, "lungs", 2);
  });

  const trachea = capsule(0.055, 0.35, systemColor("respiratory"), {});
  trachea.position.set(0, 4.55, 0.12);
  organGroup.add(trachea);
  tag(trachea, "trachea", 2);

  const diaphragm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24),
    stdMat(systemColor("respiratory"), {})
  );
  diaphragm.position.set(0, 3.65, 0);
  organGroup.add(diaphragm);
  tag(diaphragm, "diaphragm", 2);

  const brain = blob(0.21, [1, 0.95, 1.1], systemColor("nervous"), {});
  brain.position.set(0, 5.2, 0.01);
  organGroup.add(brain);
  tag(brain, "brain", 2);

  const spinalCord = capsule(0.05, 2.0, systemColor("nervous"), {});
  spinalCord.position.set(0, 3.7, -0.18);
  organGroup.add(spinalCord);
  tag(spinalCord, "spinalCord", 2);

  const stomach = blob(0.17, [1, 0.8, 0.9], systemColor("digestive"), {});
  stomach.position.set(-0.2, 3.5, 0.15);
  organGroup.add(stomach);
  tag(stomach, "stomach", 2);

  const liver = blob(0.24, [1.15, 0.6, 0.75], systemColor("digestive"), {});
  liver.material.color.set(0x8a4a3a);
  liver.position.set(0.2, 3.6, 0.12);
  organGroup.add(liver);
  tag(liver, "liver", 2);

  const pancreas = capsule(0.05, 0.28, systemColor("digestive"), {});
  pancreas.material.color.set(0xd9b98a);
  pancreas.rotation.z = Math.PI / 2.4;
  pancreas.position.set(0.0, 3.42, -0.08);
  organGroup.add(pancreas);
  tag(pancreas, "pancreas", 2);

  const smallIntestine = ring(0.14, 0.06, systemColor("digestive"), {});
  smallIntestine.position.set(0, 3.15, 0.05);
  organGroup.add(smallIntestine);
  tag(smallIntestine, "smallIntestine", 2);

  const largeIntestine = ring(0.28, 0.045, systemColor("digestive"), {});
  largeIntestine.material.color.set(0xc9a876);
  largeIntestine.position.set(0, 3.28, 0.02);
  organGroup.add(largeIntestine);
  tag(largeIntestine, "largeIntestine", 2);

  [-1, 1].forEach((side) => {
    const kidney = blob(0.1, [0.8, 1.1, 0.6], systemColor("digestive"), {});
    kidney.material.color.set(0x7a3d38);
    kidney.position.set(side * 0.3, 3.4, -0.22);
    organGroup.add(kidney);
    tag(kidney, "kidneys", 2);
  });

  const spleen = blob(0.11, [1, 0.7, 0.7], systemColor("immune"), {});
  spleen.position.set(-0.36, 3.58, -0.08);
  organGroup.add(spleen);
  tag(spleen, "spleen", 2);

  const thymus = blob(0.1, [1, 0.7, 0.55], systemColor("immune"), {});
  thymus.position.set(0, 4.38, 0.24);
  organGroup.add(thymus);
  tag(thymus, "thymus", 2);

  [-1, 1].forEach((side) => {
    const node = ball(0.045, systemColor("immune"), {});
    node.position.set(side * 0.17, 4.68, 0.08);
    organGroup.add(node);
    tag(node, "lymphNodes", 2);
  });

  // ---------------------------------------------------------
  // SKELETON — visible on layer 3
  // ---------------------------------------------------------
  const skull = ball(0.29, BONE_COLOR, {});
  skull.position.set(0, 5.17, 0);
  boneGroup.add(skull);
  tag(skull, "skull", 3);

  const vertebral = capsule(0.06, 2.15, BONE_COLOR, {});
  vertebral.position.set(0, 3.75, -0.15);
  boneGroup.add(vertebral);
  tag(vertebral, "vertebralColumn", 3);

  for (let i = 0; i < 6; i++) {
    const y = 3.78 + i * 0.14;
    const t = i / 5;
    const radius = 0.34 + Math.sin(t * Math.PI) * 0.14;
    const rib = ring(radius, 0.018, BONE_COLOR, {});
    rib.position.set(0, y, 0);
    boneGroup.add(rib);
    tag(rib, "ribCage", 3);
  }

  const pelvisBone = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.09, 10, 20, Math.PI),
    stdMat(BONE_COLOR, {})
  );
  pelvisBone.rotation.x = Math.PI;
  pelvisBone.position.set(0, 2.78, 0);
  boneGroup.add(pelvisBone);
  tag(pelvisBone, "pelvis", 3);

  [-1, 1].forEach((side) => {
    const femur = capsule(0.09, 1.0, BONE_COLOR, {});
    femur.position.set(side * 0.26, 1.95, 0);
    boneGroup.add(femur);
    tag(femur, "pelvis", 3);

    const shinBone = capsule(0.07, 0.95, BONE_COLOR, {});
    shinBone.position.set(side * 0.26, 0.75, 0);
    boneGroup.add(shinBone);
    tag(shinBone, "vertebralColumn", 3); // long bone, grouped under skeleton reading

    const humerus = capsule(0.06, 0.8, BONE_COLOR, {});
    humerus.position.set(side * 0.66, 4.0, 0);
    boneGroup.add(humerus);
    tag(humerus, "ribCage", 3);
  });

  // ---------------------------------------------------------
  // Initial visibility: layer 1 (Muscle) is the default view
  // ---------------------------------------------------------
  skinGroup.visible = false;
  muscleGroup.visible = true;
  organGroup.visible = false;
  boneGroup.visible = false;

  return { root, skinGroup, muscleGroup, organGroup, boneGroup, clickableByLayer, meshesById };
}

const LAYER_GROUPS = ["skinGroup", "muscleGroup", "organGroup", "boneGroup"];

/** Sets which layer group is visible. index: 0 skin,1 muscle,2 organs,3 skeleton */
export function setLayer(refs, index) {
  LAYER_GROUPS.forEach((key, i) => {
    refs[key].visible = i === index;
  });
}
