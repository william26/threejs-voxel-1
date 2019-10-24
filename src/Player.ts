import * as THREE from "three";

import { UpdateOptions } from "./index";

const FLOOR_LEVEL = 1.7;

export class Player {
  camera: THREE.Camera;
  speedVector = new THREE.Vector3(0, 0, 0);
  state: "walking" | "jumping" | "running" = "jumping";
  stateModifier: "running" | "normal" = "normal";

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public update(updateOptions: UpdateOptions) {
    const { camera } = this;
    const { KEYS } = updateOptions;
    const originalPosition = new THREE.Vector3();
    originalPosition.copy(camera.position);
    const playerDirectionVector = new THREE.Vector3();

    camera.getWorldDirection(playerDirectionVector);
    playerDirectionVector
      .projectOnPlane(new THREE.Vector3(0, 1, 0))
      .normalize();
    const vectorToRight = new THREE.Vector3();
    vectorToRight.copy(playerDirectionVector);
    vectorToRight.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

    if (KEYS.shift) {
      this.stateModifier = "running";
    } else {
      this.stateModifier = "normal";
    }

    if (KEYS[" "] && this.state === "walking") {
      this.state = "jumping";
      this.speedVector.add(new THREE.Vector3(0, 1, 0).multiplyScalar(0.1));
    }

    const walkingSpeed = this.stateModifier === "running" ? 0.5 : 0.1;

    if (this.state === "walking") {
      this.speedVector.copy(new THREE.Vector3(0, 0, 0));
    }

    if (KEYS.w) {
      if (this.state === "walking") {
        this.speedVector.add(
          playerDirectionVector.multiplyScalar(walkingSpeed)
        );
      }
    }
    if (KEYS.s) {
      if (this.state === "walking") {
        this.speedVector.add(
          playerDirectionVector.multiplyScalar(-walkingSpeed)
        );
      }
    }
    if (KEYS.a) {
      if (this.state === "walking") {
        this.speedVector.add(vectorToRight.multiplyScalar(-walkingSpeed));
      }
    }
    if (KEYS.d) {
      if (this.state === "walking") {
        this.speedVector.add(vectorToRight.multiplyScalar(walkingSpeed));
      }
    }

    if (camera.position.y > FLOOR_LEVEL && this.state === "jumping") {
      this.speedVector.y -= 0.005;
    }

    if (camera.position.y <= FLOOR_LEVEL && this.state === "jumping") {
      camera.position.y = FLOOR_LEVEL;
      this.state = "walking";
    }

    camera.position.add(this.speedVector);
  }
}
