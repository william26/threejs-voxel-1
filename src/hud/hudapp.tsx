import { render } from "react-dom";
import {
  Provider,
  useSelector as useReduxSelector,
  TypedUseSelectorHook
} from "react-redux";
import { createStore, combineReducers } from "redux";
import { PlayerState, playerReducer } from "./playerReducer";
import React from "react";
import { WorldState, worldReducer } from "./worldReducer";

const rootReducer = combineReducers({
  player: playerReducer,
  world: worldReducer
});

export type AppState = {
  player: PlayerState;
  world: WorldState;
};

export const useSelector: TypedUseSelectorHook<AppState> = useReduxSelector;

const store = createStore(rootReducer);

window.store = store;

function Position() {
  const position = useSelector(state => state.player.position);
  const currentCell = useSelector(state => state.player.currentCell);
  const worldGenProgress = useSelector(state => state.world.worldGenProgress);
  return (
    <>
      <div>World Gen: {(worldGenProgress * 100).toFixed(2)}</div>
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
