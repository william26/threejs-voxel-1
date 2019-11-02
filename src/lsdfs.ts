import * as THREE from "three";
import { Vector3 } from "three";
import { CELL_WIDTH, CELL_HEIGHT, CHUNK_WIDTH } from "./world-constants";

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
