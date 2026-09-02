import { useEffect, useReducer, useRef, useState } from 'react';

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface ToolResponse {
  content: { type: string; text?: string }[];
  isError?: boolean;
}

export interface WebMCPToolDefinition<Args, Result> {
  name: string;
  description: string;
  inputSchema?: object;
  annotations?: ToolAnnotations;
  execute: (args: Args) => Result | Promise<Result>;
  formatOutput?: (result: Result, args: Args) => unknown;
}

export interface WebMCPToolState {
  supported: boolean;
  registered: boolean;
  error: Error | null;
}

interface ModelContext {
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
}

function getModelContext(): ModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  return (document as unknown as { modelContext?: ModelContext }).modelContext;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function toToolResponse(value: unknown): ToolResponse {
  if (value && typeof value === 'object' && Array.isArray((value as ToolResponse).content)) {
    return value as ToolResponse;
  }
  if (value === undefined || value === null) return { content: [] };
  if (typeof value === 'string') return { content: [{ type: 'text', text: value }] };
  return { content: [{ type: 'text', text: safeStringify(value) }] };
}

function toErrorResponse(error: unknown): ToolResponse {
  const text =
    error instanceof Error ? error.message : typeof error === 'string' ? error : safeStringify(error);
  return { content: [{ type: 'text', text }], isError: true };
}

export function useWebMCPTool<Args = Record<string, unknown>, Result = unknown>(
  definition: WebMCPToolDefinition<Args, Result>,
): WebMCPToolState {
  const { name, description, inputSchema, annotations } = definition;

  const [state, setState] = useState<WebMCPToolState>({
    supported: false,
    registered: false,
    error: null,
  });

  const latest = useRef(definition);
  useEffect(() => {
    latest.current = definition;
  });

  const schemaKey = inputSchema ? JSON.stringify(inputSchema) : '';
  const annotationsKey = annotations ? JSON.stringify(annotations) : '';
  const [detectTick, redetect] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const modelContext = getModelContext();

    if (!modelContext) {
      setState({ supported: false, registered: false, error: null });
      if (typeof document === 'undefined') return;
      let attempts = 0;
      const timer = setInterval(() => {
        if (getModelContext()) {
          clearInterval(timer);
          redetect();
        } else if (++attempts >= 24) {
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }

    const controller = new AbortController();

    try {
      document.modelContext.registerTool(
        {
          name,
          description,
          inputSchema,
          annotations,
          async execute(args: unknown) {
            try {
              const current = latest.current;
              const result = await current.execute(args as Args);
              const shaped = current.formatOutput
                ? current.formatOutput(result, args as Args)
                : result;
              if (shaped instanceof Error) throw shaped;
              return toToolResponse(shaped);
            } catch (error) {
              return toErrorResponse(error);
            }
          },
        },
        { signal: controller.signal },
      );
      setState({ supported: true, registered: true, error: null });
    } catch (error) {
      setState({
        supported: true,
        registered: false,
        error: error instanceof Error ? error : new Error(safeStringify(error)),
      });
    }

    return () => controller.abort();
  }, [name, description, schemaKey, annotationsKey, detectTick, inputSchema, annotations]);

  return state;
}
