import {
  Vector3,
  Camera,
  Raycaster,
  Scene,
  PointLight,
  ArrowHelper,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh
} from "three";

import { UpdateOptions } from "./index";
import {
  setPosition,
  setCurrentCell,
  setCurrentChunk
} from "./hud/playerReducer";
import { getCellKeyForPosition, getChunkKeyForPosition } from "./lsdfs";
import localforage from "localforage";
import { VoxelWorld } from "./VoxelWorld";

let arrowHelper: THREE.Object3D | null = null;

export class Player {
  camera: Camera;
  speedVector = new Vector3(0, 0, 0);
  state: "walking" | "jumping" | "flying" = "jumping";
  stateModifier: "running" | "normal" = "normal";
  previousKeys: { [k: string]: boolean };
  world: VoxelWorld;

  constructor(camera: Camera, world: VoxelWorld) {
    this.camera = camera;
    this.previousKeys = {};
    this.world = world;

    // Load player position from index db
    // localforage.getItem<Vector3>(`player-position`).then(position => {
    //   if (position) {
    //     camera.position.copy(position);
    //   }
    // });
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

    if (!this.previousKeys.b && KEYS.b) {
      const raycast = new Raycaster(
        this.camera.position,
        this.camera.getWorldDirection(new Vector3()),
        0,
        10
      );
      const intersections = raycast.intersectObjects(scene.children);
      if (arrowHelper) {
        scene.remove(arrowHelper);
      }
      arrowHelper = new ArrowHelper(
        this.camera.getWorldDirection(new Vector3()),
        this.camera.position,
        10,
        0xff000
      );
      scene.add(arrowHelper);
      if (intersections.length) {
        const [closestIntersect] = intersections;
        if (closestIntersect.face) {
          const position = new Vector3(
            Math.floor(
              closestIntersect.point.x + closestIntersect.face.normal.x / 2
            ),
            Math.floor(
              closestIntersect.point.y + closestIntersect.face.normal.y / 2
            ),
            Math.floor(
              closestIntersect.point.z + closestIntersect.face.normal.z / 2
            )
          );

          this.world.setVoxel(position.x, position.y, position.z, 4);
        }
      }
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
      1
    );
    const rayCasterDUp = new Raycaster(
      camera.position
        .clone()
        .setY(camera.position.y)
        .setX(camera.position.x - 0.25)
        .setZ(camera.position.z + 0.25),
      this.speedVector.clone().normalize(),
      0,
      1
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
    renderIteration++;
    // Save player position for later load (see constructor)
    if (renderIteration % 100 === 0) {
      localforage.setItem<Vector3>(`player-position`, camera.position);
    }
  }
}

let renderIteration = 0;
