import "./hud/hudapp";
import * as THREE from "three";
import Stats from "stats.js";

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

window.THREE = THREE;

import { VoxelWorld } from "./VoxelWorld";
import { Player } from "./Player";
import { Color, DirectionalLight, CameraHelper, Fog, PointLight } from "three";
import { getChunkCoordinates, getKeyCoordinates } from "./lsdfs";

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

camera.position.x = -28.89;
camera.position.y = 119;
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

const pointLight = new PointLight(0xffffff, 1, 50, 2);
pointLight.castShadow = true;
// var pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
// pointLight.position.copy(camera.position);
// scene.add(pointLightHelper);
scene.add(pointLight);

const cameraSpeed = new THREE.Vector3();
async function render() {
  if (
    canvas.width !== window.innerWidth ||
    canvas.clientHeight !== window.innerHeight
  ) {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  const { chunkX, chunkZ } = getChunkCoordinates(camera.position);

  Object.keys(world.filledChunks).forEach(filledChunkKey => {
    const { x, y, z } = getKeyCoordinates(filledChunkKey);
    if (Math.abs(chunkX - x) > 2 || Math.abs(chunkZ - z) > 2) {
      world.clearChunk(x, y, z);
    }
  });

  async function generate() {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const generated = world.generateChunk(chunkX + x, 0, chunkZ + z);
        if (!generated) {
          return;
        }
      }
    }
  }

  generate();

  if (player) {
    player.update({
      KEYS,
      world,
      scene
    });
  }

  pointLight.position.copy(camera.position);

  camera.position.add(cameraSpeed);
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

player = new Player(camera, scene);
