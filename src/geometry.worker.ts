const ctx: Worker = self as any;

import { getVoxel } from "./lsdfs";
import { CELL_WIDTH, CELL_HEIGHT } from "./world-constants";
import THREE, { Vector3 } from "three";

const tileSize = 16;
const tileTextureWidth = 256;
const tileTextureHeight = 64;

type Geometry = {
  positions: number[];
  normals: number[];
  indices: number[];
  uvs: number[];
};

type Event = {
  data:
    | {
        type: "generateGeometry";
        payload: {
          cells: { [k: string]: Uint8Array };
          cellX: number;
          cellY: number;
          cellZ: number;
        };
      }
    | {
        type: "updateGeometry";
        payload: {
          cells: { [k: string]: Uint8Array };
          voxelPosition: Vector3;
          voxelType: number;
          geometry: Geometry;
        };
      };
};

ctx.addEventListener("message", function(e: Event) {
  if (e.data.type === "generateGeometry") {
    const { cells, cellX, cellY, cellZ } = e.data.payload;
    generateGeometry(cells, cellX, cellY, cellZ);
  }
  if (e.data.type === "updateGeometry") {
    const { cells, voxelPosition, voxelType, geometry } = e.data.payload;
    updateGeometry(cells, voxelPosition, voxelType, geometry);
  }
});

function updateGeometry(
  cells: { [k: string]: Uint8Array },
  voxelPosition: Vector3,
  voxelType: number,
  geometry: Geometry
) {
  const positions = geometry.positions;
  const normals = geometry.normals;
  const uvs = geometry.uvs;
  const indices = geometry.indices;
  const voxelCellX =
    THREE.Math.euclideanModulo(voxelPosition.x, CELL_WIDTH) | 0;
  const voxelCellY =
    THREE.Math.euclideanModulo(voxelPosition.y, CELL_WIDTH) | 0;
  const voxelCellZ =
    THREE.Math.euclideanModulo(voxelPosition.z, CELL_WIDTH) | 0;

  const voxel = voxelType;
  if (voxel) {
    const uvVoxel = voxel - 1;
    console.log("target", uvVoxel);
    // There is a voxel here but do we need faces for it?
    for (const { dir, corners, uvRow } of faces) {
      const neighbor = getVoxel(
        cells,
        voxelPosition.x + dir[0],
        voxelPosition.y + dir[1],
        voxelPosition.z + dir[2]
      );
      if (!neighbor) {
        // this voxel has no neighbor in this direction so we need a face.
        const ndx = positions.length / 3;
        for (const { pos, uv } of corners) {
          positions.push(
            pos[0] + voxelCellX,
            pos[1] + voxelCellY,
            pos[2] + voxelCellZ
          );
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

  ctx.postMessage({
    positions,
    normals,
    indices,
    uvs
  });
}

function generateGeometry(
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

  ctx.postMessage({
    positions,
    normals,
    indices,
    uvs
  });
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
