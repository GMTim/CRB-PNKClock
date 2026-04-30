import { buildUrl } from "./url.js";

export class ApiError extends Error {
  constructor(message, response, body) {
    super(message);
    this.name = "ApiError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
    this.body = body;
  }
}

export class HttpClient {
  constructor(options = {}) {
    const {
      baseUrl = "http://localhost:3000",
      token,
      fetch: fetchImplementation = globalThis.fetch
    } = options;

    if (!fetchImplementation) {
      throw new TypeError("A fetch implementation is required.");
    }

    this.baseUrl = baseUrl;
    this.token = token;
    this.fetch = fetchImplementation;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  async request(path, options = {}) {
    const {
      method = "GET",
      body,
      headers,
      query,
      auth = false,
      signal
    } = options;

    const requestHeaders = new Headers(headers);

    if (body !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (auth) {
      if (!this.token) {
        throw new TypeError("An auth token is required for this request.");
      }

      requestHeaders.set("Authorization", `Bearer ${this.token}`);
    }

    const response = await this.fetch(buildUrl(this.baseUrl, path, query), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });

    const parsedBody = await parseResponseBody(response);

    if (!response.ok) {
      const message =
        parsedBody && typeof parsedBody.error === "string"
          ? parsedBody.error
          : `Request failed with status ${response.status}.`;

      throw new ApiError(message, response, parsedBody);
    }

    return parsedBody;
  }
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}
