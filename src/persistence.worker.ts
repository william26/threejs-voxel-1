const ctx: Worker = self as any;

import localforage from "localforage";
import { SavedData } from "./persistence";

type Payload =
  | {
      type: "setItem";
      payload: {
        key: string;
        value: any;
      };
    }
  | {
      type: "getItem";
      payload: {
        key: string;
      };
    };

ctx.addEventListener("message", async function(e) {
  const data = e.data as Payload;

  if (data.type === "setItem") {
    try {
      await localforage.setItem<any>(data.payload.key, data.payload.value);
      ctx.postMessage(true);
    } catch {
      ctx.postMessage(false);
    }
  }

  if (data.type === "getItem") {
    try {
      const value = await localforage.getItem<any>(data.payload.key);
      ctx.postMessage(value);
    } catch {
      ctx.postMessage(null);
    }
  }
});
