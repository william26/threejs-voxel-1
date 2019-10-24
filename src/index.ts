import * as THREE from "three";

window.THREE = THREE;

import { VoxelWorld } from "./VoxelWorld";
import { Player } from "./Player";

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
camera.position.z = 200;
camera.position.x = 200;
camera.position.y = 150;
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
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  console.log("HI");
}
addLight(0.5, 1, 0.5);
addLight(0.5, 1, -0.5);

const world = new VoxelWorld();

var raycaster = new THREE.Raycaster();

const player = new Player(camera);

export type UpdateOptions = {
  KEYS: {
    [k: string]: boolean;
  };
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

  player.update({
    KEYS
  });

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

function loop() {
  render();
  window.requestAnimationFrame(loop);
}

const KEYS: { [k: string]: boolean } = {};
document.addEventListener("keydown", e => {
  KEYS[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  KEYS[e.key.toLowerCase()] = false;
});

render();
function clearScene() {
  if (world.mesh) {
    scene.remove(world.mesh);
  }
}

function generateScene() {
  clearScene();
  console.time("world generation");
  for (let x = 0; x < 7; x++) {
    for (let z = 0; z < 7; z++) {
      world.fillData(x, 0, z);
      render();
    }
  }
  console.timeEnd("world generation");
  console.time("world geometry generation");
  for (let x = 0; x < 7; x++) {
    for (let z = 0; z < 7; z++) {
      world.addMeshToScene(scene, x * 16, 0, z * 16);
      render();
    }
  }
}

const planeGeometry = new THREE.PlaneGeometry();
const planeMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff
});

const plane = new THREE.Mesh(planeGeometry, planeMaterial);

plane.scale.x = 1000; // scene.add(plane);
plane.scale.y = 1000; // scene.add(plane);
plane.scale.z = 1000; // scene.add(plane);
plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
plane.receiveShadow = true;
scene.add(plane);

generateScene();

console.timeEnd("world geometry generation");
loop();
