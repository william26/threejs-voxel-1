import { render } from "react-dom";
import {
  Provider,
  useSelector as useReduxSelector,
  TypedUseSelectorHook
} from "react-redux";
import { createStore, combineReducers } from "redux";
import { createAction, createReducer } from "redux-act";
import { Vector3 } from "three";

export const setPosition = createAction<Vector3, AppState>("SET_POSITION");
export const setCurrentCell = createAction<string, AppState>(
  "SET_CURRENT_CELL"
);

const playerReducer = createReducer(
  {
    [setPosition as any]: (state, position: Vector3) => ({
      ...state,
      position
    }),
    [setCurrentCell as any]: (state, currentCell: string) => ({
      ...state,
      currentCell
    })
  },
  {
    position: new Vector3(),
    currentCell: ""
  }
);

type PlayerState = {
  position: Vector3;
  currentCell: string;
};

const rootReducer = combineReducers({
  player: playerReducer
});

type AppState = {
  player: PlayerState;
};

export const useSelector: TypedUseSelectorHook<AppState> = useReduxSelector;

const store = createStore(rootReducer);

window.store = store;

import React from "react";

function Position() {
  const position = useSelector(state => state.player.position);
  const currentCell = useSelector(state => state.player.currentCell);
  return (
    <>
      <div>
        Position: x: {position.x.toFixed(2)}, y: {position.y.toFixed(2)}, z:{" "}
        {position.z.toFixed(2)}
      </div>
      <div>Current cell: {currentCell}</div>
    </>
  );
}

function HUDRoot() {
  return (
    <Provider store={store}>
      <Position />
    </Provider>
  );
}

render(<HUDRoot />, document.getElementById("controls"));
