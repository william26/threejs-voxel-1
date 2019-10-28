import * as THREE from "three";
import { Vector3, Mesh, MeshLambertMaterial, Scene } from "three";

import * as noise from "./noise";
noise.seed(0.1);

const CELL_WIDTH = 16;
const CELL_HEIGHT = 128;

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
    this.cells = {
      "0,0,0": new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH)
    };
    this.filled = {};
    this.meshes = {};
    this.scene = scene;
  }

  computeVoxelOffset(x: number, y: number, z: number) {
    const voxelX = THREE.Math.euclideanModulo(x, CELL_WIDTH) | 0;
    const voxelY = THREE.Math.euclideanModulo(y, CELL_HEIGHT) | 0;
    const voxelZ = THREE.Math.euclideanModulo(z, CELL_WIDTH) | 0;
    return voxelZ * CELL_WIDTH * CELL_HEIGHT + voxelY * CELL_WIDTH + voxelX;
  }

  getCellForVoxel(x: number, y: number, z: number) {
    const cellKey = this.getCellKeyForPosition(new Vector3(x, y, z));
    const cell =
      this.cells[cellKey] ||
      new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH);
    this.cells[cellKey] = cell;
    return cell;
  }

  getCellCoordinates(position: Vector3) {
    const cellX = Math.floor(position.x / CELL_WIDTH);
    const cellY = Math.floor(position.y / CELL_HEIGHT);
    const cellZ = Math.floor(position.z / CELL_WIDTH);

    return { cellX, cellY, cellZ };
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

  getCellKeyForPosition(position: Vector3) {
    const { cellX, cellY, cellZ } = this.getCellCoordinates(position);
    return this.getCellKeyForCellCoordinates(cellX, cellY, cellZ);
  }

  getCellKeyForCellCoordinates(cellX: number, cellY: number, cellZ: number) {
    return `${cellX},${cellY},${cellZ}`;
  }

  setVoxel(x: number, y: number, z: number, v: 1 | 0) {
    const cell = this.getCellForVoxel(x, y, z);
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
  }

  getVoxel(x: number, y: number, z: number) {
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return 0;
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return cell[voxelOffset];
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
    const positions = [];
    const normals = [];
    const indices = [];
    const startX = cellX * CELL_WIDTH;
    const startY = cellY * CELL_HEIGHT;
    const startZ = cellZ * CELL_WIDTH;

    for (let y = 0; y < CELL_HEIGHT; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < CELL_WIDTH; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < CELL_WIDTH; ++x) {
          const voxelX = startX + x;
          const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
          if (voxel) {
            // There is a voxel here but do we need faces for it?
            for (const { dir, corners } of VoxelWorld.faces) {
              const neighbor = this.getVoxel(
                voxelX + dir[0],
                voxelY + dir[1],
                voxelZ + dir[2]
              );
              if (!neighbor) {
                // this voxel has no neighbor in this direction so we need a face.
                const ndx = positions.length / 3;
                for (const pos of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                  normals.push(...dir);
                }
                indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
              }
            }
          }
        }
      }
    }

    const geometryData = {
      positions,
      normals,
      indices
    };

    return geometryData;
  }

  getMeshes() {
    return Object.values(this.meshes);
  }

  getMeshesAround(position: Vector3) {
    let meshes: Array<Mesh | undefined> = [];
    const { cellX, cellY, cellZ } = this.getCellCoordinates(position);
    const currentCellCenter = this.getCellWorldCenterForPosition(position);
    const positionFromCellCenter = position.clone().sub(currentCellCenter);

    const getMesh = (offsetX: number, offsetY: number, offsetZ: number) => {
      const mesh = this.meshes[
        this.getCellKeyForCellCoordinates(
          cellX + offsetX,
          cellY + offsetY,
          cellZ + offsetZ
        )
      ];

      if (mesh) {
        return mesh;
      }

      this.fillData(cellX + offsetX, cellY + offsetY, cellZ + offsetZ);
      return this.addMeshToScene(
        this.scene,
        (cellX + offsetX) * CELL_WIDTH,
        (cellY + offsetY) * CELL_HEIGHT,
        (cellZ + offsetZ) * CELL_WIDTH
      );
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

  addMeshToScene(scene: THREE.Scene, x: number, y: number, z: number) {
    const cellX = Math.floor(x / CELL_WIDTH);
    const cellY = Math.floor(y / CELL_HEIGHT);
    const cellZ = Math.floor(z / CELL_WIDTH);

    if (this.currentMesh === `${cellX},${cellY},${cellZ}`) {
      return this.meshes[`${cellX},${cellY},${cellZ}`];
    }
    this.currentMesh = `${cellX},${cellY},${cellZ}`;

    const { positions, normals, indices } = this.generateGeometryDataForCell(
      cellX,
      cellY,
      cellZ
    );

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
    const cellKey = this.getCellKeyForPosition(new Vector3(x, y, z));
    this.meshes[cellKey] = mesh;

    scene.add(mesh);

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
