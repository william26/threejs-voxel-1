import * as THREE from "three";
import { Vector3, Mesh, MeshLambertMaterial, Scene, Texture } from "three";
import GeometryWorker from "worker-loader!./geometry.worker";
import DataWorker from "worker-loader!./world-data.worker";
import localforage from "localforage";

import * as noise from "./noise";
noise.seed(0.1);

import {
  getCellKeyForPosition,
  getCoordinatesKey,
  computeVoxelOffset,
  getCellCoordinates,
  getCellForVoxel,
  getKeyCoordinates
} from "./lsdfs";
import { CELL_WIDTH, CELL_HEIGHT, CHUNK_WIDTH } from "./world-constants";

type WorldMeshGeometryData = {
  positions: any;
  normals: any;
  indices: any;
  uvs: any;
};

export class VoxelWorld {
  static faces: Array<{
    dir: [number, number, number];
    uvRow: number;
    corners: [
      { pos: [number, number, number]; uv: [number, number] },
      { pos: [number, number, number]; uv: [number, number] },
      { pos: [number, number, number]; uv: [number, number] },
      { pos: [number, number, number]; uv: [number, number] }
    ];
  }>;

  cells: {
    [k: string]: Uint8Array;
  } = {};
  scene: Scene;
  meshes: { [k: string]: Mesh };
  texture: Texture;

  constructor(scene: Scene, texture: Texture) {
    this.cells = {};
    this.meshes = {};
    this.scene = scene;
    this.texture = texture;
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

  setVoxel(x: number, y: number, z: number, v: 1 | 0) {
    const cell = getCellForVoxel(this.cells, x, y, z);
    const voxelOffset = computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
  }

  filledChunks: { [k: string]: boolean } = {};

  async clearChunk(chunkX: number, chunkY: number, chunkZ: number) {
    const chunkKey = getCoordinatesKey(chunkX, chunkY, chunkZ);
    if (this.filledChunks[chunkKey]) {
      const cellMeshes = Object.keys(this.meshes);
      cellMeshes.forEach(cellKey => {
        const { x: cellX, y: cellY, z: cellZ } = getKeyCoordinates(cellKey);

        const cellChunkKey = getCoordinatesKey(
          Math.floor(cellX / CHUNK_WIDTH),
          Math.floor(cellY / CHUNK_WIDTH),
          Math.floor(cellZ / CHUNK_WIDTH)
        );

        if (chunkKey === cellChunkKey) {
          this.filledGeometry[cellKey] = false;
          this.filledMeshes[cellKey] = false;
          this.filledChunks[chunkKey] = false;
          this.scene.remove(this.meshes[cellKey]);
          delete this.meshes[cellKey];
        }
      });
    }
  }

  async generateChunk(chunkX: number, chunkY: number, chunkZ: number) {
    const chunkKey = getCoordinatesKey(chunkX, 0, chunkZ);

    if (this.filledChunks[chunkKey]) {
      return null;
    }
    this.filledChunks[chunkKey] = true;

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_WIDTH; z++) {
        const cellX = chunkX * CHUNK_WIDTH + x;
        const cellY = 0;
        const cellZ = chunkZ * CHUNK_WIDTH + z;
        await this.fillData(cellX, cellY, cellZ);
        await this.addMeshToScene(
          chunkX * CHUNK_WIDTH * CELL_WIDTH + x * CELL_WIDTH,
          0,
          chunkZ * CHUNK_WIDTH * CELL_WIDTH + z * CELL_WIDTH
        );
      }
    }
  }

  filledData: { [k: string]: boolean } = {};

  async fillData(cellX: number, cellY: number, cellZ: number) {
    const cellKey = getCoordinatesKey(cellX, cellY, cellZ);
    if (this.filledData[cellKey]) {
      return Promise.resolve();
    }
    this.filledData[cellKey] = true;

    const savedData = await localforage.getItem<Uint8Array>(
      `world-data:${cellKey}`
    );
    if (savedData) {
      this.cells[cellKey] = savedData;
    }

    return new Promise(resolve => {
      const worker = new DataWorker();
      worker.onmessage = async e => {
        this.cells[cellKey] = e.data;
        await localforage.setItem<Uint8Array>(`world-data:${cellKey}`, e.data);
        resolve();
        worker.terminate();
      };
      // Sending cell & its coordinates to worker
      worker.postMessage([
        cellX,
        cellY,
        cellZ,
        this.cells[cellKey] ||
          new Uint8Array(CELL_WIDTH * CELL_WIDTH * CELL_HEIGHT)
      ]);
    });
  }

  filledMeshes: { [k: string]: boolean } = {};

  async addMeshToScene(x: number, y: number, z: number) {
    const cellX = Math.floor(x / CELL_WIDTH);
    const cellY = Math.floor(y / CELL_HEIGHT);
    const cellZ = Math.floor(z / CELL_WIDTH);
    const cellKey = getCellKeyForPosition(new Vector3(x, y, z));

    if (this.filledMeshes[cellKey]) {
      return;
    }
    this.filledMeshes[cellKey] = true;

    const geometryData = await this.generateGeometryDataForCell(
      cellX,
      cellY,
      cellZ
    );

    if (!geometryData) {
      return null;
    }

    const { positions, normals, indices, uvs } = geometryData;

    const geometry = new THREE.BufferGeometry();
    const material = new MeshLambertMaterial({
      color: 0xffffff,
      map: this.texture,
      alphaTest: 0.1,
      transparent: true
    });

    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
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
    geometry.addAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents)
    );
    geometry.setIndex(indices);
    const mesh = new Mesh(geometry, material);
    mesh.position.x = cellX * CELL_WIDTH;
    mesh.position.y = cellY * CELL_HEIGHT;
    mesh.position.z = cellZ * CELL_WIDTH;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.meshes[cellKey] = mesh;

    this.scene.add(mesh);

    // await localforage.setItem<Mesh>(`world-mesh:${cellKey}`, mesh);

    return mesh;
  }

  filledGeometry: { [k: string]: boolean } = {};

  async generateGeometryDataForCell(
    cellX: number,
    cellY: number,
    cellZ: number
  ) {
    const cellKey = getCoordinatesKey(cellX, cellY, cellZ);
    if (this.filledGeometry[cellKey]) {
      return Promise.resolve(null);
    }
    this.filledGeometry[cellKey] = true;

    const savedGeometry = await localforage.getItem<WorldMeshGeometryData>(
      `world-geometry:${cellKey}`
    );
    if (savedGeometry) {
      return savedGeometry;
    }

    return new Promise<WorldMeshGeometryData>(resolve => {
      const worker = new GeometryWorker();
      worker.postMessage([this.cells, cellX, cellY, cellZ]);
      worker.onmessage = async (e: any) => {
        await localforage.setItem<WorldMeshGeometryData>(
          `world-geometry:${cellKey}`,
          e.data as WorldMeshGeometryData
        );
        resolve(e.data as WorldMeshGeometryData);
        worker.terminate();
      };
    });
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
}

VoxelWorld.faces = [
  {
    // left
    uvRow: 0,
    dir: [-1, 0, 0],
    corners: [
      // points
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] }
    ]
  },
  {
    // right
    uvRow: 0,
    dir: [1, 0, 0],
    corners: [
      // points
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] }
    ]
  },
  {
    // bottom
    uvRow: 1,
    dir: [0, -1, 0],
    corners: [
      // points
      { pos: [1, 0, 1], uv: [0, 1] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [1, 0] }
    ]
  },
  {
    // top
    uvRow: 2,
    dir: [0, 1, 0],
    corners: [
      // points
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [0, 0] },
      { pos: [0, 1, 0], uv: [1, 1] },
      { pos: [1, 1, 0], uv: [1, 0] }
    ]
  },
  {
    // back
    uvRow: 0,
    dir: [0, 0, -1],
    corners: [
      // points
      { pos: [1, 0, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [0, 1, 0], uv: [1, 0] }
    ]
  },
  {
    // front
    uvRow: 0,
    dir: [0, 0, 1],
    corners: [
      // points
      { pos: [0, 0, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [1, 0] }
    ]
  }
];
