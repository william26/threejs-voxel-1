import { Vector3 } from "three";
import { createAction, createReducer } from "redux-act";

import { AppState } from "./hudapp";

export const setPosition = createAction<Vector3, AppState>("SET_POSITION");
export const setCurrentCell = createAction<string, AppState>(
  "SET_CURRENT_CELL"
);
export const setCurrentChunk = createAction<string, AppState>(
  "SET_CURRENT_CHUNK"
);

export const playerReducer = createReducer(
  {
    [setPosition as any]: (state, position: Vector3) => ({
      ...state,
      position
    }),
    [setCurrentCell as any]: (state, currentCell: string) => ({
      ...state,
      currentCell
    }),
    [setCurrentChunk as any]: (state, currentChunk: string) => ({
      ...state,
      currentChunk
    })
  },
  {
    position: new Vector3(),
    currentCell: "",
    currentChunk: ""
  }
);

export type PlayerState = {
  position: Vector3;
  currentCell: string;
  currentChunk: string;
};
