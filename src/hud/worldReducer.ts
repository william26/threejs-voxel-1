import { Vector3 } from "three";
import { createAction, createReducer } from "redux-act";

import { AppState } from "./hudapp";

export const setGenerationProgress = createAction<number, AppState>(
  "SET_WORLD_GEN_PROGRESS"
);

export const worldReducer = createReducer(
  {
    [setGenerationProgress as any]: (state, progress: number) => ({
      ...state,
      worldGenProgress: progress
    })
  },
  {
    worldGenProgress: 0
  }
);

export type WorldState = {
  worldGenProgress: number;
};
