import { HttpClient } from "./core/http.js";
import { buildUrl } from "./core/url.js";

export class RPGClockReadClient {
  constructor(options = {}) {
    const {
      baseUrl = "http://localhost:3000",
      token,
      fetch,
      EventSource: EventSourceImplementation = globalThis.EventSource
    } = options;

    this.baseUrl = baseUrl;
    this.http = new HttpClient({ baseUrl, token, fetch });
    this.EventSource = EventSourceImplementation;
  }

  get token() {
    return this.http.token;
  }

  setToken(token) {
    this.http.setToken(token);
  }

  clearToken() {
    this.http.clearToken();
  }

  getHealth(options = {}) {
    return this.http.request("/health", {
      signal: options.signal
    });
  }

  getGames(options = {}) {
    return this.http.request("/games", {
      auth: true,
      signal: options.signal
    });
  }

  createEventsUrl(gameId) {
    if (!gameId) {
      throw new TypeError("gameId is required.");
    }

    return buildUrl(this.baseUrl, "/events", { gameId });
  }

  subscribeToGameEvents(gameId, options = {}) {
    if (!this.EventSource) {
      throw new TypeError("An EventSource implementation is required.");
    }

    const {
      eventHandlers = {},
      onMessage,
      onError,
      eventSourceOptions
    } = options;

    const source = new this.EventSource(
      this.createEventsUrl(gameId),
      eventSourceOptions
    );

    if (onMessage) {
      source.onmessage = onMessage;
    }

    if (onError) {
      source.onerror = onError;
    }

    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      source.addEventListener(eventName, handler);
    }

    return source;
  }
}
