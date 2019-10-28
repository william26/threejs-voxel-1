import "./hud/hudapp";
import * as THREE from "three";

window.THREE = THREE;

import { VoxelWorld } from "./VoxelWorld";
import { Player } from "./Player";
import { setGenerationProgress } from "./hud/worldReducer";

const canvas = document.createElement("canvas");

const root = document.getElementById("root");
if (root) {
  root.appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMapEnabled = true;

const fov = 75;
const aspect = window.innerWidth / window.innerHeight; // the canvas default
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 20;
camera.position.x = 20;
camera.position.y = 137;
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

function addLight(x: number, y: number, z: number) {
  const light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
}
addLight(0.3, 0.4, 0.3);

const light = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(light);

const world = new VoxelWorld(scene);

var raycaster = new THREE.Raycaster();

let player: Player | undefined;

export type UpdateOptions = {
  KEYS: {
    [k: string]: boolean;
  };
  world: VoxelWorld;
  scene: THREE.Scene;
};

const cameraSpeed = new THREE.Vector3();
function render() {
  if (
    canvas.width !== window.innerWidth ||
    canvas.clientHeight !== window.innerHeight
  ) {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if (player) {
    player.update({
      KEYS,
      world,
      scene
    });
  }

  if (world.mesh) {
    raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
    let intersection = raycaster.intersectObject(world.mesh);

    if (intersection) {
      const [{ distance } = { distance: 0 }] = intersection;

      if (distance < 10) {
        cameraSpeed.y = 0;
      } else {
        cameraSpeed.y -= 0.01;
      }
    }
  }
  camera.position.add(cameraSpeed);
  renderer.render(scene, camera);
}

let isLooping = true;

function loop() {
  render();
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

function clearScene() {
  if (world.mesh) {
    scene.remove(world.mesh);
  }
}

function generateScene(cellsWidth: number) {
  clearScene();
  window.store.dispatch(setGenerationProgress(0));

  let worldGenProgress = 0;
  let maxSteps = cellsWidth * cellsWidth * 2;
  function worldGenProgressStep() {
    worldGenProgress++;
    window.store.dispatch(setGenerationProgress(worldGenProgress / maxSteps));
  }
  for (let x = 0; x < cellsWidth; x++) {
    for (let z = 0; z < cellsWidth; z++) {
      worldGenProgressStep();
      world.fillData(
        x - Math.floor(cellsWidth / 2),
        0,
        z - Math.floor(cellsWidth / 2)
      );
      render();
    }
  }
  for (let x = 0; x < cellsWidth; x++) {
    for (let z = 0; z < cellsWidth; z++) {
      worldGenProgressStep();
      world.addMeshToScene(
        scene,
        (x - Math.floor(cellsWidth / 2)) * 16,
        0,
        (z - Math.floor(cellsWidth / 2)) * 16
      );
      render();
    }
  }
}

generateScene(2);

loop();

player = new Player(camera);
