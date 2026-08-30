declare module '@mkkellogg/gaussian-splats-3d' {
  export class Viewer {
    constructor(options?: any);
    addSplatScene(path: string, options?: any): Promise<void>;
    addSplatScenes(scenes: any[]): Promise<void>;
    start(): void;
    stop(): void;
    dispose(): void;
    update(): void;
  }

  export class DropInViewer {
    constructor(options?: any);
    addSplatScene(path: string, options?: any): Promise<void>;
    addSplatScenes(scenes: any[]): Promise<void>;
    update(): void;
    dispose(): void;
  }
}
