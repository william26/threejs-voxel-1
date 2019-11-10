import "./hud/hudapp";
import * as THREE from "three";
import Stats from "stats.js";

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

window.data = {};

window.THREE = THREE;

import { VoxelWorld } from "./VoxelWorld";
import { Player } from "./Player";
import { Color, DirectionalLight } from "three";
import { getCellCoordinates, getCoordinatesKey } from "./lsdfs";

import voxelImage from "./assets/flourish-cc-by-nc-sa.png";

const canvas = document.createElement("canvas");

const root = document.getElementById("root");
if (root) {
  root.appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMapType = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

const fov = 75;
const aspect = window.innerWidth / window.innerHeight; // the canvas default
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.frustumCulled = true;

camera.position.x = -28.89;
camera.position.y = 150;
camera.position.z = 35.41;
camera.lookAt(new THREE.Vector3(0, 0, 0));

function rotateFromMouseMovement(e: MouseEvent) {
  camera.rotateX((e.movementY / 300) * -1);
  camera.rotateOnWorldAxis(
    new THREE.Vector3(0, 1, 0),
    (e.movementX / 300) * -1
  );
}

canvas.addEventListener("click", () => {
  canvas.requestPointerLock();

  canvas.addEventListener("mousemove", rotateFromMouseMovement);
});
let mouseCaptured = false;
document.addEventListener("pointerlockchange", e => {
  if (mouseCaptured) {
    canvas.removeEventListener("mousemove", rotateFromMouseMovement);
  }
  mouseCaptured = !mouseCaptured;
});

const scene = new THREE.Scene();
// scene.fog = new Fog(0x000000, 0.1, 128);
scene.background = new Color(0xf0f0f0);

const directionalLight = new DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(255, 255, 0);
directionalLight.target.position.set(0, 0, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 512; // default
directionalLight.shadow.mapSize.height = 512; // default
directionalLight.shadow.camera.near = 0.5; // default
directionalLight.shadow.camera.far = 500; // default
const d = 1000;

directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.top = d;
directionalLight.shadow.camera.bottom = -d;

scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const loader = new THREE.TextureLoader();
const texture = loader.load(voxelImage, render);
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;

const world = new VoxelWorld(scene, texture);

let player: Player | undefined;

export type UpdateOptions = {
  KEYS: {
    [k: string]: boolean;
  };
  world: VoxelWorld;
  scene: THREE.Scene;
};

const GENERATION_RADIUS = 2;
async function render() {
  if (
    canvas.width !== window.innerWidth ||
    canvas.clientHeight !== window.innerHeight
  ) {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  const { cellX, cellZ } = getCellCoordinates(camera.position);

  let shouldComputeMoreMeshes = false;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const cellKey = getCoordinatesKey(cellX + i, 0, cellZ + j);
      shouldComputeMoreMeshes =
        shouldComputeMoreMeshes || !world.filledMeshes[cellKey];
    }
  }

  if (shouldComputeMoreMeshes) {
    // PRELOAD (= generate / retrieve from indexedDB) 81 cells (9x9)
    // around the player & store in live memory for fast access
    // clear cells from memory that aren't in that list
    // Mostly async
    const cellGenerationStart = window.performance.now();
    for (let x = -GENERATION_RADIUS; x <= GENERATION_RADIUS; x++) {
      for (let z = -GENERATION_RADIUS; z <= GENERATION_RADIUS; z++) {
        world.generateCell(cellX + x, 0, cellZ + z);
      }
    }
    window.data.cellGenerationTime =
      window.performance.now() - cellGenerationStart;

    // RENDER 9 cells around the player in scene
    // remove cells in scene that aren't in list
    const cellAdditionStart = window.performance.now();
    const meshesToRender: { [k: string]: boolean } = {};
    for (let x = -GENERATION_RADIUS; x <= GENERATION_RADIUS; x++) {
      for (let z = -GENERATION_RADIUS; z <= GENERATION_RADIUS; z++) {
        const cellKey = getCoordinatesKey(cellX + x, 0, cellZ + z);
        meshesToRender[cellKey] = true;

        world.addCellMesh(cellX + x, 0, cellZ + z);
      }
    }
    window.data.cellAdditionTime = window.performance.now() - cellAdditionStart;
    window.data.meshesToRender = meshesToRender;

    // CLEAR cell meshes that shouldn't be rendered
    const cellRemovalStart = window.performance.now();
    Object.keys({ ...world.filledMeshes }).forEach(cellKey => {
      if (!meshesToRender[cellKey]) {
        world.removeCellMesh(cellKey);
      }
    });
    window.data.cellRemovalTime = window.performance.now() - cellRemovalStart;
  }

  const playerUpdateStart = window.performance.now();
  if (player) {
    const currentCellKey = getCoordinatesKey(cellX, 0, cellZ);
    if (world.filledMeshes[currentCellKey]) {
      player.update({
        KEYS,
        world,
        scene
      });
    }
  }
  window.data.playerUpdateTime = window.performance.now() - playerUpdateStart;

  renderer.render(scene, camera);
}

let isLooping = true;

function loop() {
  stats.begin();
  render();
  stats.end();
  if (isLooping) {
    window.requestAnimationFrame(loop);
  }
}

const KEYS: { [k: string]: boolean } = {};
document.addEventListener("keydown", e => {
  KEYS[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  KEYS[e.key.toLowerCase()] = false;
});

loop();

player = new Player(camera, world);
