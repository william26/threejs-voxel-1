import * as THREE from "three";
import { Vector3, Mesh, MeshLambertMaterial, Scene } from "three";
import Worker from "worker-loader!./geometry.worker";

import * as noise from "./noise";
noise.seed(0.1);

const CELL_WIDTH = 16;
const CELL_HEIGHT = 255;
const CHUNK_WIDTH = 5;

import {
  getCellKeyForPosition,
  getCoordinatesKey,
  computeVoxelOffset,
  getCellCoordinates,
  getCellForVoxel
} from "./lsdfs";

export class VoxelWorld {
  static faces: Array<{
    dir: [number, number, number];
    corners: [
      [number, number, number],
      [number, number, number],
      [number, number, number],
      [number, number, number]
    ];
  }>;

  cells: {
    [k: string]: Uint8Array;
  };
  filled: {
    [k: string]: boolean;
  };
  scene: Scene;

  currentMesh?: string;
  mesh?: Mesh;
  meshes: { [k: string]: Mesh };

  constructor(scene: Scene) {
    this.cells = {};
    this.filled = {};
    this.meshes = {};
    this.scene = scene;
  }

  getCellWorldCenterForPosition(position: Vector3) {
    const cellX = Math.floor(position.x / CELL_WIDTH);
    const cellY = Math.floor(position.y / CELL_HEIGHT);
    const cellZ = Math.floor(position.z / CELL_WIDTH);

    return new Vector3(
      cellX * CELL_WIDTH + CELL_WIDTH / 2,
      cellY * CELL_HEIGHT + CELL_HEIGHT / 2,
      cellZ * CELL_WIDTH + CELL_WIDTH / 2
    );
  }

  getChunkCoordinates(position: Vector3) {
    const { cellX, cellY, cellZ } = getCellCoordinates(position);

    return {
      chunkX: Math.floor(cellX / CHUNK_WIDTH),
      chunkY: Math.floor(cellY / CHUNK_WIDTH),
      chunkZ: Math.floor(cellZ / CHUNK_WIDTH)
    };
  }

  setVoxel(x: number, y: number, z: number, v: 1 | 0) {
    const cell = getCellForVoxel(this.cells, x, y, z);
    const voxelOffset = computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
  }

  fillData(cellX: number, cellY: number, cellZ: number) {
    if (this.filled[`${cellX},${cellY},${cellZ}`]) {
      return null;
    }
    this.filled[`${cellX},${cellY},${cellZ}`] = true;

    for (let y = 0; y < CELL_HEIGHT; y++) {
      const yWorld = y + cellY * CELL_HEIGHT;
      for (let x = 0; x < CELL_WIDTH; x++) {
        const xWorld = x + cellX * CELL_WIDTH;
        for (let z = 0; z < CELL_WIDTH; z++) {
          const zWorld = z + cellZ * CELL_WIDTH;
          const baseHeight =
            (noise.simplex2(xWorld / CELL_HEIGHT, zWorld / CELL_HEIGHT) *
              CELL_HEIGHT) /
              30 +
            100;

          const roughness =
            (noise.simplex2(xWorld / 32 + 20, zWorld / 32 + 20) * CELL_HEIGHT) /
            30;
          const roughness2 =
            (noise.simplex2(xWorld / CELL_HEIGHT, zWorld / CELL_HEIGHT) *
              CELL_HEIGHT) /
            10;
          const roughness3 =
            (noise.simplex2(xWorld / 100, zWorld / 100) * CELL_HEIGHT) / 15;
          const density1 = noise.simplex3(
            xWorld / 50,
            yWorld / 16,
            zWorld / 50
          );
          if (
            (density1 > -0.2 || yWorld > 80) &&
            // (1 / (yWorld * yWorld + 1)) * density3 < 0 &&
            yWorld < baseHeight + roughness + roughness2 + roughness3
          ) {
            this.setVoxel(xWorld, yWorld, zWorld, 1);
          }
        }
      }
    }
  }

  generateGeometryDataForCell(cellX: number, cellY: number, cellZ: number) {
    return new Promise<{
      positions: any;
      normals: any;
      indices: any;
    }>((resolve, reject) => {
      const worker = new Worker();
      worker.postMessage([this.cells, cellX, cellY, cellZ]);
      worker.onmessage = function(e: any) {
        resolve(e.data);
      };
    });
  }

  getMeshes() {
    return Object.values(this.meshes);
  }

  generateChunks(position: Vector3) {
    const { chunkX, chunkZ } = this.getChunkCoordinates(position);

    if (
      this.cells[
        getCoordinatesKey(chunkX * CHUNK_WIDTH + 1, 0, chunkZ * CHUNK_WIDTH + 1)
      ]
    ) {
      return;
    }

    console.log("GENERATING CHUNK", `${chunkX},0,${chunkZ}`);
    console.time("DATA");
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        const cellX = chunkX * CHUNK_WIDTH + x;
        const cellZ = chunkZ * CHUNK_WIDTH + z;
        this.fillData(cellX, 0, cellZ);
      }
    }
    console.timeEnd("DATA");
    console.time("MESH");
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        this.addMeshToScene(
          chunkX * CHUNK_WIDTH * CELL_WIDTH + x * CELL_WIDTH,
          0,
          chunkZ * CHUNK_WIDTH * CELL_WIDTH + z * CELL_WIDTH
        );
      }
    }
    console.timeEnd("MESH");
  }

  getMeshesAround(position: Vector3) {
    let meshes: Array<Mesh | undefined> = [];
    const { cellX, cellY, cellZ } = getCellCoordinates(position);
    const currentCellCenter = this.getCellWorldCenterForPosition(position);
    const positionFromCellCenter = position.clone().sub(currentCellCenter);

    const getMesh = (offsetX: number, offsetY: number, offsetZ: number) => {
      const mesh = this.meshes[
        getCoordinatesKey(cellX + offsetX, cellY + offsetY, cellZ + offsetZ)
      ];

      if (mesh) {
        return mesh;
      }

      // this.fillData(cellX + offsetX, cellY + offsetY, cellZ + offsetZ);
      // return this.addMeshToScene(
      //   this.scene,
      //   (cellX + offsetX) * CELL_WIDTH,
      //   (cellY + offsetY) * CELL_HEIGHT,
      //   (cellZ + offsetZ) * CELL_WIDTH
      // );
    };

    const GENERATED_CELLS_RADIUS = 1;
    for (let x = 0; x <= GENERATED_CELLS_RADIUS * 2; x++) {
      for (let y = 0; y <= GENERATED_CELLS_RADIUS * 2; y++) {
        for (let z = 0; z <= GENERATED_CELLS_RADIUS * 2; z++) {
          getMesh(
            x - GENERATED_CELLS_RADIUS,
            y - GENERATED_CELLS_RADIUS,
            z - GENERATED_CELLS_RADIUS
          );
        }
      }
    }

    const center = [getMesh(0, -1, 0), getMesh(0, 0, 0), getMesh(0, 1, 0)];
    const left = [getMesh(-1, -10, 0), getMesh(-1, 0, 0), getMesh(-1, 1, 0)];
    const front = [getMesh(0, -1, 1), getMesh(0, 0, 1), getMesh(0, 1, 1)];
    const frontLeft = [
      getMesh(-1, -10, 1),
      getMesh(-1, 0, 1),
      getMesh(-1, 1, 1)
    ];
    const back = [getMesh(0, -1, -1), getMesh(0, 0, -1), getMesh(0, 1, -1)];
    const backLeft = [
      getMesh(-1, -10, -1),
      getMesh(-1, 0, -1),
      getMesh(-1, 1, -1)
    ];
    const right = [getMesh(1, -1, 0), getMesh(1, 0, 0), getMesh(1, 1, 0)];
    const frontRight = [getMesh(1, -1, 1), getMesh(1, 0, 1), getMesh(1, 1, 1)];
    const backRight = [
      getMesh(1, -1, -1),
      getMesh(1, 0, -1),
      getMesh(1, 1, -1)
    ];

    // center
    meshes = [...meshes, ...center];

    if (positionFromCellCenter.x < 0) {
      // left
      meshes = [...meshes, ...left];

      if (positionFromCellCenter.z < 0) {
        // front
        meshes = [...meshes, ...front];
        // front left
        meshes = [...meshes, ...frontLeft];
      } else {
        // back
        meshes = [...meshes, ...back];
        // back left
        meshes = [...meshes, ...backLeft];
      }
    } else {
      // right
      meshes = [...meshes, ...right];
      if (positionFromCellCenter.z < 0) {
        // front
        meshes = [...meshes, ...front];
        // front right
        meshes = [...meshes, ...frontRight];
      } else {
        // back
        meshes = [...meshes, ...back];
        // back right
        meshes = [...meshes, ...backRight];
      }
    }

    return meshes.filter(Boolean) as Array<Mesh>;
  }

  async addMeshToScene(x: number, y: number, z: number) {
    const cellX = Math.floor(x / CELL_WIDTH);
    const cellY = Math.floor(y / CELL_HEIGHT);
    const cellZ = Math.floor(z / CELL_WIDTH);

    if (this.currentMesh === `${cellX},${cellY},${cellZ}`) {
      return this.meshes[`${cellX},${cellY},${cellZ}`];
    }
    this.currentMesh = `${cellX},${cellY},${cellZ}`;

    const {
      positions,
      normals,
      indices
    } = await this.generateGeometryDataForCell(cellX, cellY, cellZ);

    const geometry = new THREE.BufferGeometry();
    const material = new MeshLambertMaterial({
      color: 0xffffff - Math.random() * 0xffffff
    });

    const positionNumComponents = 3;
    const normalNumComponents = 3;
    geometry.addAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(positions),
        positionNumComponents
      )
    );
    geometry.addAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    geometry.setIndex(indices);
    const mesh = new Mesh(geometry, material);
    mesh.position.x = cellX * CELL_WIDTH;
    mesh.position.y = cellY * CELL_HEIGHT;
    mesh.position.z = cellZ * CELL_WIDTH;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const cellKey = getCellKeyForPosition(new Vector3(x, y, z));
    this.meshes[cellKey] = mesh;

    this.scene.add(mesh);

    return mesh;
  }
}

VoxelWorld.faces = [
  {
    dir: [-1, 0, 0],
    corners: [
      // points
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 1],
      [0, 0, 1]
    ]
  },
  {
    // right
    dir: [1, 0, 0],
    corners: [
      // points
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 0, 0]
    ]
  },
  {
    // bottom
    dir: [0, -1, 0],
    corners: [
      // points
      [1, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, 0]
    ]
  },
  {
    // top
    dir: [0, 1, 0],
    corners: [
      // points
      [0, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
      [1, 1, 0]
    ]
  },
  {
    // back
    dir: [0, 0, -1],
    corners: [
      // points
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  },
  {
    // front
    dir: [0, 0, 1],
    corners: [
      // points
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1]
    ]
  }
];
