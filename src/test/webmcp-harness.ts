export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (args: unknown) => Promise<unknown> | unknown;
}

export interface MockModelContext {
  registry: Map<string, RegisteredTool>;
  registerTool: (definition: RegisteredTool, options?: { signal?: AbortSignal }) => void;
  call: (name: string, args?: unknown) => Promise<Record<string, unknown>>;
  names: () => string[];
}

export function installMockModelContext(): MockModelContext {
  const registry = new Map<string, RegisteredTool>();

  const mock: MockModelContext = {
    registry,
    registerTool(definition, options) {
      registry.set(definition.name, definition);
      options?.signal?.addEventListener('abort', () => registry.delete(definition.name));
    },
    async call(name, args) {
      const tool = registry.get(name);
      if (!tool) throw new Error(`Tool not registered: ${name}`);
      const result = (await tool.execute(args ?? {})) as {
        content?: { text?: string }[];
      };
      const text = result?.content?.[0]?.text;
      return text ? JSON.parse(text) : (result as Record<string, unknown>);
    },
    names() {
      return [...registry.keys()];
    },
  };

  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool: (definition: RegisteredTool, options?: { signal?: AbortSignal }) =>
        mock.registerTool(definition, options),
    },
    configurable: true,
    writable: true,
  });

  return mock;
}

export function removeModelContext(): void {
  Object.defineProperty(document, 'modelContext', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}
