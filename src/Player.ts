import { Vector3, Camera, Raycaster, Scene, PointLight } from "three";

import { UpdateOptions } from "./index";
import {
  setPosition,
  setCurrentCell,
  setCurrentChunk
} from "./hud/playerReducer";
import { getCellKeyForPosition, getChunkKeyForPosition } from "./lsdfs";
import localforage from "localforage";

export class Player {
  camera: Camera;
  speedVector = new Vector3(0, 0, 0);
  state: "walking" | "jumping" | "flying" = "flying";
  stateModifier: "running" | "normal" = "normal";
  previousKeys: { [k: string]: boolean };
  light: PointLight;

  constructor(camera: Camera, scene: Scene) {
    this.camera = camera;
    this.previousKeys = {};
    const light = new PointLight(0xffffff, 0.9, 16, 1);
    light.position.copy(camera.position);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    // scene.add(light);
    this.light = light;

    // Load player position from index db
    localforage.getItem<Vector3>(`player-position`).then(position => {
      if (position) {
        camera.position.copy(position);
      }
    });
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

    if (KEYS.v && !this.previousKeys.v) {
      this.state = this.state !== "flying" ? "flying" : "walking";
      console.log("HELO", this.state);
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

    if (this.state !== "flying") {
      if (KEYS[" "]) {
        if (this.state === "walking") {
          this.state = "jumping";
          this.speedVector.y += 0.25;
        }
      } else {
        this.state = "walking";
      }
    } else {
      if (KEYS[" "]) {
        this.speedVector.y = 0.25;
      } else if (KEYS.c) {
        this.speedVector.y = -0.25;
      } else {
        this.speedVector.y = 0;
      }
    }

    if (this.state !== "flying") {
      this.speedVector.y -= 0.02;
    }

    const newPosition = camera.position.clone();
    newPosition.add(this.speedVector);

    const rayCasterA = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1.7)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterB = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1.7)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterC = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1.7)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterD = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y - 1.7)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterAUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterBUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z - 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
    );
    const rayCasterCUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y)
        .setX(camera.position.x + 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1000
    );
    const rayCasterDUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y)
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
      setCurrentCell(getCellKeyForPosition(camera.position))
    );
    window.store.dispatch(
      setCurrentChunk(getChunkKeyForPosition(camera.position))
    );

    this.previousKeys = { ...KEYS };
    this.light.position.copy(
      camera.position.clone().setX(camera.position.x - 3)
    );
    i++;

    // Save player position for later load (see constructor)
    if (i % 100 === 0) {
      localforage.setItem<Vector3>(`player-position`, camera.position);
    }
  }
}
let i = 0;
