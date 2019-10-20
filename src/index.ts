import * as THREE from "three";

window.THREE = THREE;

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
camera.position.z = 200;
camera.position.x = 200;
camera.position.y = 100;
camera.lookAt(new THREE.Vector3(0, 0, 0));

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

const world = new VoxelWorld();

var raycaster = new THREE.Raycaster();

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

  if (KEYS.w) {
    camera.position.x -= Math.sin(camera.rotation.y) * 1;
    camera.position.z -= Math.cos(camera.rotation.y) * 1;
  }
  if (KEYS.s) {
    camera.position.x += Math.sin(camera.rotation.y) * 1;
    camera.position.z += Math.cos(camera.rotation.y) * 1;
  }
  if (KEYS.a) {
    camera.position.x -= Math.cos(camera.rotation.y - Math.PI / 2) * 1;
    camera.position.z -= Math.sin(camera.rotation.y - Math.PI / 2) * 1;
  }
  if (KEYS.d) {
    camera.position.x += Math.cos(camera.rotation.y - Math.PI / 2) * 1;
    camera.position.z += Math.sin(camera.rotation.y - Math.PI / 2) * 1;
  }
  if (KEYS.e) {
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 120);
  }
  if (KEYS.q) {
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), +Math.PI / 120);
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

function loop() {
  render();
  window.requestAnimationFrame(loop);
}

const KEYS: { [k: string]: boolean } = {};
document.addEventListener("keydown", e => {
  KEYS[e.key] = true;
});
document.addEventListener("keyup", e => {
  KEYS[e.key] = false;
});

render();

console.time("world generation");
for (let x = 0; x < 32; x++) {
  for (let z = 0; z < 32; z++) {
    world.fillData(x, 0, z);
    render();
  }
}
console.timeEnd("world generation");
console.time("world geometry generation");
for (let x = 0; x < 32; x++) {
  for (let z = 0; z < 32; z++) {
    world.addMeshToScene(scene, x * 16, 0, z * 16);
    render();
  }
}
console.timeEnd("world geometry generation");
loop();
