import localforage from "localforage";
import PersistenceWorker from "worker-loader!./persistence.worker";

export type SavedData = {
  [k: string]: Promise<any>;
};

let currentData: SavedData = {};
export async function setItem<T>(itemName: string, value: T) {
  currentData[itemName] = Promise.resolve(value);
  localforage.setItem<T>(itemName, value);
  const worker = new PersistenceWorker();
  new Promise((resolve, reject) => {
    worker.onmessage = e => {
      if (e.data) {
        resolve();
      } else {
        reject();
      }
      worker.terminate();
    };
    worker.postMessage({
      type: "setItem",
      payload: {
        key: itemName,
        value
      }
    });
  });
}

export async function getItem<T>(itemName: string) {
  if (currentData[itemName]) {
    return await currentData[itemName];
  }

  const worker = new PersistenceWorker();

  currentData[itemName] = new Promise(resolve => {
    worker.onmessage = e => {
      resolve(e.data);
      worker.terminate();
    };
    worker.postMessage({
      type: "getItem",
      payload: {
        key: itemName
      }
    });
  });

  return await currentData[itemName];
}

export async function free(itemName: string) {
  delete currentData[itemName];
}

// let promise: Promise<SavedData> | null = null;
// async function getCurrentData() {
//   if (currentData) {
//     return currentData;
//   } else if (promise) {
//     return await promise;
//   } else {
//     promise = localforage
//       .getItem<number>("length")
//       .then(len =>
//         Promise.all(
//           [...new Array(len)].map((_, index) => {
//             return localforage.getItem<SavedData>(`data${index}`);
//           })
//         )
//       )
//       .then(dataArray => {
//         // Data object reconstruction from split array
//         return dataArray.reduce(
//           (acc, dataObjectChunk) => ({
//             ...acc,
//             ...dataObjectChunk
//           }),
//           {}
//         );
//       });
//     const data = await promise;
//     if (!currentData) {
//       currentData = data;
//     }
//     return await promise;
//   }
// }

// const debouncedSetData = debounce(async (data: any) => {
//   const timestamp = new Date().getTime();

//   const keys = Object.keys(data);
//   const storageChunkSize = 5;
//   const storageChunkCount = keys.length / storageChunkSize;
//   const chunkedKeys: Array<string[]> = [];
//   for (let i = 0; i < storageChunkCount; i++) {
//     for (let j = 0; j < storageChunkSize; j++) {
//       chunkedKeys[i] = chunkedKeys[i] || [];
//       chunkedKeys[i][j] = keys[i * storageChunkSize + j];
//     }
//   }

//   const chunkedData = chunkedKeys.map(keysChunk => {
//     return JSON.stringify(
//       keysChunk.reduce(
//         (acc, key) => ({
//           ...acc,
//           ...(key && { [key]: data[key] })
//         }),
//         {}
//       )
//     );
//   });

//   const worker = new PersistenceWorker();
//   new Promise(resolve => {
//     worker.onmessage = () => {
//       worker.terminate();
//       resolve();
//     };
//   });
//   console.time(`SAVED DATA, ${timestamp}`);
//   worker.postMessage([chunkedData]);
//   console.timeEnd(`SAVED DATA, ${timestamp}`);

//   // await localforage.setItem<number>("length", chunkedData.length);
//   // await Promise.all(
//   //   chunkedData.map((dataChunk, index) => {
//   //     return localforage.setItem<any>(`data${index}`, dataChunk);
//   //   })
//   // );
// }, 1000);
