declare module 'heic-decode' {
  type Decoded = { width: number; height: number; data: Uint8ClampedArray };
  type Images = Array<{ width: number; height: number; decode: () => Promise<Decoded> }> & { dispose: () => void };
  const decode: { all: (input: { buffer: Uint8Array }) => Promise<Images> };
  export default decode;
}
