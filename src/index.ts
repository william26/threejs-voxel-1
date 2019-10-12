import * as THREE from "three";

import { Vector3 } from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const canvas = document.createElement("canvas");
const root = document.getElementById("root");
if (root) {
  root.appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ canvas });

const fov = 75;
const aspect = window.innerWidth / window.innerHeight; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 5;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.update();

const boxWidth = 1;
const boxHeight = 1;
const boxDepth = 1;
const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

const scene = new THREE.Scene();
const color = 0xffffff;

const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

function makeInstance(
  geometry: THREE.BoxGeometry,
  color: THREE.Color | number,
  x: number
) {
  const material = new THREE.MeshPhongMaterial({ color });

  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  cube.position.x = x;

  return cube;
}

makeInstance(geometry, 0x44aa88, 0);
makeInstance(geometry, 0x8844aa, -2);
makeInstance(geometry, 0xaa8844, 2);

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
