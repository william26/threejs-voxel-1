import * as THREE from "three";

window.THREE = THREE;

import { Vector3 } from "three";
import * as noise from "./noise";
noise.seed(0.1);

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VoxelWorld } from "./VoxelWorld";

const canvas = document.createElement("canvas");
const root = document.getElementById("root");
if (root) {
  root.appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas });

const fov = 75;
const aspect = window.innerWidth / window.innerHeight; // the canvas default
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 300;
camera.position.x = 300;
camera.position.y = 300;

const controls = new OrbitControls(camera, canvas);
controls.target.set(128, 0, 129);
controls.enableDamping = true;
controls.update();

const scene = new THREE.Scene();

function addLight(x: number, y: number, z: number) {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(x, y, z);
  scene.add(light);
}
addLight(-1, 2, 4);
addLight(1, -1, -2);

const cellSize = 256;

const world = new VoxelWorld(cellSize);

for (let y = 0; y < cellSize; y++) {
  for (let x = 0; x < cellSize; x++) {
    for (let z = 0; z < cellSize; z++) {
      const baseHeight = noise.simplex2(x / cellSize / 3, z / cellSize / 3);
      const roughness = noise.simplex2((x / cellSize) * 4, (z / cellSize) * 4);
      const roughness2 = noise.simplex2(
        (x / cellSize) * 15,
        (z / cellSize) * 15
      );
      if (
        y <
        (baseHeight * cellSize) / 5 +
          (roughness * cellSize) / 40 +
          (roughness2 * cellSize) / 200 +
          64
      ) {
        world.setVoxel(x, y, z, 1);
      }
    }
  }
}

world.addMeshToScene(scene);

let renderRequested = false;
function render() {
  renderRequested = false;
  if (
    canvas.width !== window.innerWidth ||
    canvas.clientHeight !== window.innerHeight
  ) {
    console.log("RENDERING", canvas.clientWidth);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  controls.update();
  renderer.render(scene, camera);
}

render();

function renderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    window.requestAnimationFrame(render);
  }
}

controls.addEventListener("change", renderIfNotRequested);
window.addEventListener("resize", renderIfNotRequested);
