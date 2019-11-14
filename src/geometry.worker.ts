const ctx: Worker = self as any;

import { generateGeometry } from "./lsdfs";
import { Vector3 } from "three";

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
    const geometryData = generateGeometry(cells, cellX, cellY, cellZ);
    ctx.postMessage(geometryData);
  }
});
