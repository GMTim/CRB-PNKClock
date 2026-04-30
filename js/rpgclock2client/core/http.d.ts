export class ApiError<TBody = unknown> extends Error {
  constructor(message: string, response: Response, body: TBody);
  status: number;
  statusText: string;
  response: Response;
  body: TBody;
}

export class HttpClient {
  constructor(options?: {
    baseUrl?: string;
    token?: string;
    fetch?: typeof fetch;
  });

  baseUrl: string;
  token?: string;
  fetch: typeof fetch;
  setToken(token: string): void;
  clearToken(): void;
  request<TBody = unknown>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      headers?: HeadersInit;
      query?: Record<string, string | number | boolean | null | undefined>;
      auth?: boolean;
      signal?: AbortSignal;
    }
  ): Promise<TBody>;
}
