import * as THREE from "three";

import * as noise from "./noise";
noise.seed(0.1);

const CELL_WIDTH = 16;
const CELL_HEIGHT = 256;

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

  currentMesh?: string;
  mesh?: THREE.Mesh;

  constructor() {
    this.cells = {
      "0,0,0": new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH)
    };
    this.filled = {};
  }

  computeVoxelOffset(x: number, y: number, z: number) {
    const voxelX = THREE.Math.euclideanModulo(x, CELL_WIDTH) | 0;
    const voxelY = THREE.Math.euclideanModulo(y, CELL_HEIGHT) | 0;
    const voxelZ = THREE.Math.euclideanModulo(z, CELL_WIDTH) | 0;
    return voxelZ * CELL_WIDTH * CELL_HEIGHT + voxelY * CELL_WIDTH + voxelX;
  }

  getCellForVoxel(x: number, y: number, z: number) {
    const cellX = Math.floor(x / 15);
    const cellY = Math.floor(y / 255);
    const cellZ = Math.floor(z / 15);
    const cell =
      this.cells[`${cellX},${cellY},${cellZ}`] ||
      new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH);
    this.cells[`${cellX},${cellY},${cellZ}`] = cell;
    return cell;
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
            5;
          const roughness =
            (noise.simplex2(
              (xWorld / CELL_HEIGHT) * 4,
              (zWorld / CELL_HEIGHT) * 4
            ) *
              CELL_HEIGHT) /
            20;
          const roughness2 =
            (noise.simplex2(
              (xWorld / CELL_HEIGHT) * 15,
              (zWorld / CELL_HEIGHT) * 15
            ) *
              CELL_HEIGHT) /
            50;
          if (yWorld < baseHeight + roughness + roughness2 + 10) {
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

    return {
      positions,
      normals,
      indices
    };
  }

  addMeshToScene(scene: THREE.Scene, x: number, y: number, z: number) {
    const cellX = Math.floor(x / CELL_WIDTH);
    const cellY = Math.floor(y / CELL_HEIGHT);
    const cellZ = Math.floor(z / CELL_WIDTH);

    if (this.currentMesh === `${cellX},${cellY},${cellZ}`) {
      return;
    }
    this.currentMesh = `${cellX},${cellY},${cellZ}`;

    const { positions, normals, indices } = this.generateGeometryDataForCell(
      cellX,
      cellY,
      cellZ
    );

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshLambertMaterial({
      color: 0xff00ff * Math.random()
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
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = cellX * CELL_WIDTH;
    mesh.position.y = cellY * CELL_HEIGHT;
    mesh.position.z = cellZ * CELL_WIDTH;

    scene.add(mesh);
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
