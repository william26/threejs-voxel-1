import { CELL_HEIGHT, CELL_WIDTH } from "./world-constants";

const ctx: Worker = self as any;
import * as noise from "./noise";

ctx.addEventListener("message", function(e) {
  const [cellX, cellY, cellZ] = e.data as [number, number, number];

  const voxelsToSet: Array<{
    x: number;
    y: number;
    z: number;
    type: number;
  }> = [];

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
        const density1 = noise.simplex3(xWorld / 50, yWorld / 16, zWorld / 50);
        if (
          (density1 > -0.2 || yWorld > 80) &&
          // (1 / (yWorld * yWorld + 1)) * density3 < 0 &&
          yWorld < baseHeight + roughness + roughness2 + roughness3
        ) {
          voxelsToSet.push({
            x: xWorld,
            y: yWorld,
            z: zWorld,
            type: 1
          });
        }
      }
    }
  }

  ctx.postMessage(voxelsToSet);
});
