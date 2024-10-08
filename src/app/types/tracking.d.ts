declare module 'tracking' {
    export class ObjectTracker {
      constructor(type: string);
      setInitialScale(scale: number): void;
      setStepSize(step: number): void;
      setEdgesDensity(density: number): void;
      on(event: string, callback: (event: any) => void): void;
    }
  
    export function track(
      element: HTMLElement | string,
      tracker: ObjectTracker,
      options?: { camera: boolean }
    ): void;
  }