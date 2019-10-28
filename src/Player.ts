import { Vector3, Camera, Raycaster, Box3 } from "three";

import { UpdateOptions } from "./index";
import { setPosition, setCurrentCell } from "./hud/hudapp";

export class Player {
  camera: Camera;
  speedVector = new Vector3(0, 0, 0);
  state: "walking" | "jumping" | "running" = "jumping";
  stateModifier: "running" | "normal" = "normal";

  constructor(camera: Camera) {
    this.camera = camera;
  }

  public update(updateOptions: UpdateOptions) {
    const { camera } = this;
    const { KEYS, world, scene } = updateOptions;
    const originalPosition = new Vector3();
    originalPosition.copy(camera.position);
    const playerDirectionVector = new Vector3();

    camera.getWorldDirection(playerDirectionVector);
    playerDirectionVector.projectOnPlane(new Vector3(0, 1, 0)).normalize();
    const vectorToRight = new Vector3();
    vectorToRight.copy(playerDirectionVector);
    vectorToRight.applyAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2);

    if (KEYS.shift) {
      this.stateModifier = "running";
    } else {
      this.stateModifier = "normal";
    }

    const walkingSpeed = this.stateModifier === "running" ? 0.25 : 0.1;

    this.speedVector.setX(0);
    this.speedVector.setZ(0);
    if (KEYS.w) {
      this.speedVector.add(playerDirectionVector.multiplyScalar(walkingSpeed));
    }
    if (KEYS.s) {
      this.speedVector.add(playerDirectionVector.multiplyScalar(-walkingSpeed));
    }
    if (KEYS.a) {
      this.speedVector.add(vectorToRight.multiplyScalar(-walkingSpeed));
    }
    if (KEYS.d) {
      this.speedVector.add(vectorToRight.multiplyScalar(walkingSpeed));
    }

    if (KEYS[" "]) {
      if (this.state === "walking") {
        this.state = "jumping";
        this.speedVector.y += 0.25;
      }
    } else {
      this.state = "walking";
    }

    this.speedVector.y -= 0.02;

    const newPosition = camera.position.clone();
    newPosition.add(this.speedVector);

    const rayCasterA = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterB = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterC = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterD = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterAUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y + 0.5)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterBUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y + 0.5)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterCUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y + 0.5)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1000
    );
    const rayCasterDUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y + 0.5)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1000
    );

    [
      rayCasterA,
      rayCasterB,
      rayCasterC,
      rayCasterD,
      rayCasterAUp,
      rayCasterBUp,
      rayCasterCUp,
      rayCasterDUp
    ].forEach(rayCaster => {
      const moveDistance = this.speedVector.length();
      const meshes = world.getMeshesAround(camera.position);
      const intersections = rayCaster.intersectObjects(meshes);

      for (let intersection of intersections) {
        if (intersection.distance < moveDistance + 0.2) {
          if (intersection.face) {
            const normal = intersection.face.normal;
            this.speedVector.sub(
              this.speedVector.clone().projectOnVector(normal)
            );
          }
        }
      }
    });
    window.store.dispatch(setPosition(camera.position.clone()));

    camera.position.add(this.speedVector);
    window.store.dispatch(
      setCurrentCell(world.getCellKeyForPosition(camera.position))
    );
  }
}
