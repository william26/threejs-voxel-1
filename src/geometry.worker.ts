import * as THREE from "three";
import { Vector3 } from "three";

const ctx: Worker = self as any;

const CELL_WIDTH = 16;
const CELL_HEIGHT = 255;
const CHUNK_WIDTH = 5;

import { getVoxel } from "./lsdfs";

ctx.addEventListener("message", function(e) {
  const [cell, cellX, cellY, cellZ] = e.data as [any, number, number, number];
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
        const voxel = getVoxel(cell, voxelX, voxelY, voxelZ);
        if (voxel) {
          // There is a voxel here but do we need faces for it?
          for (const { dir, corners } of faces) {
            const neighbor = getVoxel(
              cell,
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

  ctx.postMessage({
    positions,
    normals,
    indices
  });
});

const faces = [
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