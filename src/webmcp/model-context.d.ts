import type { ToolAnnotations, ToolResponse } from './useWebMCPTool';

declare global {
  interface Document {
    modelContext: {
      registerTool: (
        definition: {
          name: string;
          description: string;
          inputSchema?: object;
          annotations?: ToolAnnotations;
          execute: (args: unknown) => Promise<ToolResponse>;
        },
        options?: { signal?: AbortSignal },
      ) => void;
    };
  }
}

export {};
