import * as THREE from "three";
import { Vector3 } from "three";

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
  meshes: Array<THREE.Mesh>;

  constructor() {
    this.cells = {
      "0,0,0": new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH)
    };
    this.filled = {};
    this.meshes = [];
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
              5 +
            120;
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
          const density1 = noise.simplex3(
            xWorld / 64,
            yWorld / 32,
            zWorld / 64
          );
          const density2 = noise.simplex3(
            xWorld / 16,
            yWorld / 16,
            zWorld / 16
          );
          const density3 = noise.simplex3(xWorld / 8, yWorld / 8, zWorld / 8);

          // if (yWorld < 20 || xWorld === 0 || zWorld === 0) {
          //   this.setVoxel(xWorld, yWorld, zWorld, 1);
          // }
          if (
            // density1 + density2 / 2 + density3 / 4 < 0 &&
            yWorld <
            baseHeight + roughness + roughness2
          ) {
            this.setVoxel(xWorld, yWorld, zWorld, 1);
          }
        }
      }
    }
  }

  getBoundingBoxesAround(point: Vector3) {
    const boundingBoxes: Array<THREE.Box3> = [];
    const worldX = Math.floor(point.x);
    const worldY = Math.floor(point.y);
    const worldZ = Math.floor(point.z);

    for (let x = worldX - 5; x < worldX + 5; x++) {
      for (let y = worldY - 5; y < worldY + 5; y++) {
        for (let z = worldZ - 5; z < worldZ + 5; z++) {
          if (this.getVoxel(x, y, z)) {
            const boundingBox = new THREE.Box3(
              new Vector3(x, y, z),
              new Vector3(x + 1, y + 1, z + 1)
            );
            boundingBoxes.push(boundingBox);
          }
        }
      }
    }

    return boundingBoxes;
  }

  generateGeometryDataForCell(cellX: number, cellY: number, cellZ: number) {
    // try {
    //   const storedGeometryData = JSON.parse(localStorage.getItem(
    //     `${cellX},${cellY},${cellZ}`
    //   ) as string);
    //   if (storedGeometryData) {
    //     return storedGeometryData;
    //   } else {
    //     console.log("No stored geometry data for cell, generating");
    //   }
    // } catch (e) {
    //   console.log("No stored geometry data for cell, generating");
    // }

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

    // localStorage.setItem(
    //   `${cellX},${cellY},${cellZ}`,
    //   JSON.stringify(geometryData)
    // );

    return geometryData;
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
      color: 0xffffff
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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.meshes.push(mesh);

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
