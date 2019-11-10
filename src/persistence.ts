import localforage from "localforage";
import { debounce } from "lodash";

function splitSlice(str: string, len: number) {
  var ret: string[] = [];
  for (var offset = 0, strLen = str.length; offset < strLen; offset += len) {
    ret.push(str.slice(offset, len + offset));
  }
  return ret;
}

let currentData: SavedData | null = null;
const debouncedSetData = debounce(async (data: any) => {
  console.log("SAVING DATA");
  const keys = Object.keys(data);
  const storageChunkSize = 5;
  const storageChunkCount = keys.length / storageChunkSize;
  const chunkedKeys: Array<string[]> = [];
  for (let i = 0; i < storageChunkCount; i++) {
    for (let j = 0; j < storageChunkSize; j++) {
      chunkedKeys[i] = chunkedKeys[i] || [];
      chunkedKeys[i][j] = keys[i * storageChunkSize + j];
    }
  }

  const chunkedData = chunkedKeys.map(keysChunk => {
    return keysChunk.reduce(
      (acc, key) => ({
        ...acc,
        ...(key && { [key]: data[key] })
      }),
      {}
    );
  });

  await localforage.setItem<number>("length", chunkedData.length);
  await Promise.all(
    chunkedData.map((dataChunk, index) => {
      return localforage.setItem<any>(`data${index}`, dataChunk);
    })
  );
}, 5000);

let promise: Promise<SavedData> | null = null;
async function getCurrentData() {
  if (currentData) {
    return currentData;
  } else if (promise) {
    return await promise;
  } else {
    console.log("GET CURRENT DATA");
    promise = localforage
      .getItem<number>("length")
      .then(len =>
        Promise.all(
          [...new Array(len)].map((_, index) => {
            return localforage.getItem<SavedData>(`data${index}`);
          })
        )
      )
      .then(dataArray => {
        // Data object reconstruction from split array
        return dataArray.reduce(
          (acc, dataObjectChunk) => ({
            ...acc,
            ...dataObjectChunk
          }),
          {}
        );
      });
    const data = await promise;
    if (!currentData) {
      currentData = data;
    }
    return await promise;
  }
}

export async function setItem<T>(itemName: string, value: T) {
  const data = await getCurrentData();
  data[itemName] = value;
  debouncedSetData(currentData);
}

type SavedData = {
  [k: string]: any;
};

export async function getItem<T>(itemName: string) {
  const data = await getCurrentData();
  return data[itemName] as T;
}
