import * as THREE from "three";
import { WEBVR } from "three/examples/jsm/vr/WebVR";
import { OBJLoader2 } from "three/examples/jsm/loaders/OBJLoader2";

import windmillAsset from "./assets/windmill_001.obj";
import { Vector3, Object3D } from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
document.body.appendChild(WEBVR.createButton(renderer, {} as any));
renderer.vr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// const objLoader = new OBJLoader2();
// objLoader.load(windmillAsset, windmillObject => {
//   scene.add(windmillObject);
//   windmillObject.position.z = -20;
// });

// scene.add(cube);

const planeSize = 40;

const loader = new THREE.TextureLoader();
const texture = loader.load(
  "https://threejsfundamentals.org/threejs/resources/images/checker.png"
);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
const repeats = planeSize / 2;
texture.repeat.set(repeats, repeats);

function createFloor() {
  const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshPhongMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(planeGeo, planeMat);
  mesh.rotation.x = Math.PI * -0.5;
  scene.add(mesh);
}

function createSkyLight() {
  const skyColor = 0xb1e1ff; // light blue
  const groundColor = 0xb97a20; // brownish orange
  const intensity = 1;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);
}
// CUBE
const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.11);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

let bullets: Array<Bullet> = [];

class Bullet {
  speed: number = 0;
  speedY: number = 0.0;
  mesh = new THREE.Mesh(geometry, material);
  constructor(position: Vector3, rotation: THREE.Euler, speed: number) {
    this.mesh.position.copy(position);
    this.mesh.rotation.copy(rotation);
    this.mesh.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 2);
    this.speed = speed;
    scene.add(this.mesh);
  }
  update() {
    this.speed *= 0.5;
    this.mesh.translateY(this.speed);
  }
}

createFloor();
createSkyLight();
let controllers: Array<THREE.Group> = [];
function addControllers() {
  const pointerGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);

  for (let i = 0; i < 2; ++i) {
    const controller = renderer.vr.getController(i);
    const navigatorGamepad = navigator.getGamepads()[i];
    (controller as any).navigatorGamepad = navigatorGamepad;
    scene.add(controller);
    controllers.push(controller);
    controller.addEventListener("selectstart", () => {
      console.log("EOLO");
      bullets.push(new Bullet(controller.position, controller.rotation, 0.5));
    });

    const line = new THREE.Line(pointerGeometry);
    line.scale.z = 5;
    controller.add(line);
    // this.controllers.push({ controller, line });
  }
}
addControllers();

(window as any).controllers = controllers;
(window as any).renderer = renderer as any;

renderer.setAnimationLoop(function() {
  bullets.forEach(b => {
    b.update();
  });
  renderer.render(scene, camera);
});
