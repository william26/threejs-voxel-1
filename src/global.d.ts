declare module "*.obj" {
  const objPath: string;
  export default objPath;
}

declare module "worker-loader!*" {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}

interface Window {
  store: {
    dispatch: (action: { type: string; payload: any }) => void;
  };
}
