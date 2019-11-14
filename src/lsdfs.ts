import * as THREE from "three";
import { Vector3 } from "three";
import { CELL_WIDTH, CELL_HEIGHT, CHUNK_WIDTH } from "./world-constants";
const tileSize = 16;
const tileTextureWidth = 256;
const tileTextureHeight = 64;

export function getCellCoordinates(position: Vector3) {
  const cellX = Math.floor(position.x / CELL_WIDTH);
  const cellY = Math.floor(position.y / CELL_HEIGHT);
  const cellZ = Math.floor(position.z / CELL_WIDTH);

  return { cellX, cellY, cellZ };
}

export function computeVoxelOffset(x: number, y: number, z: number) {
  const voxelX = THREE.Math.euclideanModulo(x, CELL_WIDTH) | 0;
  const voxelY = THREE.Math.euclideanModulo(y, CELL_HEIGHT) | 0;
  const voxelZ = THREE.Math.euclideanModulo(z, CELL_WIDTH) | 0;
  return voxelZ * CELL_WIDTH * CELL_HEIGHT + voxelY * CELL_WIDTH + voxelX;
}

export function getCoordinatesKey(X: number, Y: number, Z: number) {
  return `${X},${Y},${Z}`;
}

export function getKeyCoordinates(key: string) {
  const match = key.match(/(.*),(.*),(.*)/);
  if (match) {
    const [, x, y, z] = match;
    return { x: parseInt(x, 10), y: parseInt(y, 10), z: parseInt(z, 10) };
  }
  throw new Error("Invalid coordinates key");
}

export function getCellKeyForPosition(position: Vector3) {
  const { cellX, cellY, cellZ } = getCellCoordinates(position);
  return getCoordinatesKey(cellX, cellY, cellZ);
}

export function getChunkKeyForPosition(position: Vector3) {
  const { cellX, cellY, cellZ } = getCellCoordinates(position);
  return getCoordinatesKey(
    Math.floor(cellX / CHUNK_WIDTH),
    Math.floor(cellY / CHUNK_WIDTH),
    Math.floor(cellZ / CHUNK_WIDTH)
  );
}

export function getCellForVoxel(
  cells: { [k: string]: Uint8Array },
  x: number,
  y: number,
  z: number
) {
  const cellKey = getCellKeyForPosition(new Vector3(x, y, z));
  const cell =
    cells[cellKey] || new Uint8Array(CELL_WIDTH * CELL_HEIGHT * CELL_WIDTH);
  cells[cellKey] = cell;
  return cell;
}

export function getVoxel(
  cells: { [k: string]: Uint8Array },
  x: number,
  y: number,
  z: number
) {
  const cell = getCellForVoxel(cells, x, y, z);
  if (!cell) {
    return 0;
  }
  const voxelOffset = computeVoxelOffset(x, y, z);
  return cell[voxelOffset];
}

export function getChunkCoordinates(position: Vector3) {
  const { cellX, cellY, cellZ } = getCellCoordinates(position);

  return {
    chunkX: Math.floor(cellX / CHUNK_WIDTH),
    chunkY: Math.floor(cellY / CHUNK_WIDTH),
    chunkZ: Math.floor(cellZ / CHUNK_WIDTH)
  };
}

export function generateGeometry(
  cells: { [k: string]: Uint8Array },
  cellX: number,
  cellY: number,
  cellZ: number
) {
  const positions = [];
  const normals = [];
  const uvs = [];
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
        const voxel = getVoxel(cells, voxelX, voxelY, voxelZ);
        if (voxel) {
          const uvVoxel = voxel - 1;
          // There is a voxel here but do we need faces for it?
          for (const { dir, corners, uvRow } of faces) {
            const neighbor = getVoxel(
              cells,
              voxelX + dir[0],
              voxelY + dir[1],
              voxelZ + dir[2]
            );
            if (!neighbor) {
              // this voxel has no neighbor in this direction so we need a face.
              const ndx = positions.length / 3;
              for (const { pos, uv } of corners) {
                positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                normals.push(...dir);
                uvs.push(
                  ((uvVoxel + uv[0]) * tileSize) / tileTextureWidth,
                  1 - ((uvRow + 1 - uv[1]) * tileSize) / tileTextureHeight
                );
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
    indices,
    uvs
  };
}

const faces = [
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
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] }
    ]
  },
  {
    // top
    uvRow: 2,
    dir: [0, 1, 0],
    corners: [
      // points
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] }
    ]
  },
  {
    // back
    uvRow: 0,
    dir: [0, 0, -1],
    corners: [
      // points
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] }
    ]
  },
  {
    // front
    uvRow: 0,
    dir: [0, 0, 1],
    corners: [
      // points
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] }
    ]
  }
];
