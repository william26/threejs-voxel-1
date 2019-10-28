declare module "*.obj" {
  const objPath: string;
  export default objPath;
}

interface Window {
  store: {
    dispatch: (action: { type: string; payload: any }) => void;
  };
}
