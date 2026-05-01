import { HttpClient } from "./core/http.js";
import { buildUrl } from "./core/url.js";

const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 45000;

export class ManagedEventSourceSubscription {
  constructor(url, EventSourceImplementation, options = {}) {
    const {
      eventHandlers = {},
      onMessage,
      onError,
      eventSourceOptions,
      connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
      reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
      maxReconnectDelayMs = DEFAULT_MAX_RECONNECT_DELAY_MS,
      keepAliveTimeoutMs = DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
      signal
    } = options;

    this.url = url;
    this.EventSource = EventSourceImplementation;
    this.eventSourceOptions = eventSourceOptions;
    this.connectionTimeoutMs = connectionTimeoutMs;
    this.reconnectDelayMs = reconnectDelayMs;
    this.maxReconnectDelayMs = maxReconnectDelayMs;
    this.keepAliveTimeoutMs = keepAliveTimeoutMs;
    this.signal = signal;
    this.source = undefined;
    this.closed = false;
    this.connected = false;
    this.connectionAttempt = 0;
    this.connectionTimer = undefined;
    this.keepAliveTimer = undefined;
    this.reconnectTimer = undefined;
    this.listeners = new Map();
    this.activityListeners = new Map();

    this.onmessage = onMessage;
    this.onerror = onError;
    this.onopen = undefined;

    for (const [eventName, handler] of Object.entries(eventHandlers)) {
      this.addEventListener(eventName, handler);
    }

    this.handleAbort = () => this.close();

    if (this.signal) {
      if (this.signal.aborted) {
        this.close();
        return;
      }

      this.signal.addEventListener("abort", this.handleAbort, { once: true });
    }

    this.connect();
  }

  get readyState() {
    if (this.closed) {
      return this.EventSource.CLOSED ?? 2;
    }

    return this.source?.readyState ?? this.EventSource.CONNECTING ?? 0;
  }

  get withCredentials() {
    return Boolean(this.source?.withCredentials);
  }

  addEventListener(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(handler);

    if (this.source) {
      this.attachActivityListener(eventName);
      this.source.addEventListener(eventName, handler);
    }
  }

  removeEventListener(eventName, handler) {
    const handlers = this.listeners.get(eventName);

    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    }

    if (this.source) {
      this.source.removeEventListener(eventName, handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this.listeners.get(event.type);

    if (!handlers) {
      return true;
    }

    for (const handler of handlers) {
      if (typeof handler === "function") {
        handler.call(this, event);
      } else {
        handler.handleEvent(event);
      }
    }

    return !event.defaultPrevented;
  }

  close() {
    this.closed = true;
    this.clearTimers();
    this.closeSource();

    if (this.signal) {
      this.signal.removeEventListener("abort", this.handleAbort);
    }
  }

  connect() {
    if (this.closed) {
      return;
    }

    this.closeSource();
    this.connected = false;
    this.connectionAttempt += 1;
    this.source = new this.EventSource(this.url, this.eventSourceOptions);
    this.attachSourceHandlers();
    this.armConnectionTimer();
  }

  attachSourceHandlers() {
    this.source.onopen = (event) => {
      this.markActivity();

      if (this.onopen) {
        this.onopen(event);
      }
    };

    this.source.onmessage = (event) => {
      this.markActivity();

      if (this.onmessage) {
        this.onmessage(event);
      }
    };

    this.source.onerror = (event) => {
      if (this.onerror) {
        this.onerror(event);
      }

      if (!this.connected) {
        this.scheduleReconnect();
      }
    };

    this.source.addEventListener("connected", () => {
      this.connected = true;
      this.connectionAttempt = 0;
      this.clearConnectionTimer();
      this.markActivity();
    });

    for (const [eventName, handlers] of this.listeners) {
      this.attachActivityListener(eventName);

      for (const handler of handlers) {
        this.source.addEventListener(eventName, handler);
      }
    }
  }

  attachActivityListener(eventName) {
    if (!this.activityListeners.has(eventName)) {
      this.activityListeners.set(eventName, () => this.markActivity());
    }

    this.source.addEventListener(
      eventName,
      this.activityListeners.get(eventName)
    );
  }

  markActivity() {
    this.clearKeepAliveTimer();

    if (this.closed || !this.keepAliveTimeoutMs) {
      return;
    }

    this.keepAliveTimer = setTimeout(() => {
      this.scheduleReconnect();
    }, this.keepAliveTimeoutMs);
  }

  armConnectionTimer() {
    this.clearConnectionTimer();

    if (!this.connectionTimeoutMs) {
      return;
    }

    this.connectionTimer = setTimeout(() => {
      if (!this.connected) {
        this.scheduleReconnect();
      }
    }, this.connectionTimeoutMs);
  }

  scheduleReconnect() {
    if (this.closed || this.reconnectTimer) {
      return;
    }

    this.clearConnectionTimer();
    this.clearKeepAliveTimer();
    this.closeSource();

    const delay = Math.min(
      this.reconnectDelayMs * 2 ** Math.max(this.connectionAttempt - 1, 0),
      this.maxReconnectDelayMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  closeSource() {
    if (!this.source) {
      return;
    }

    this.source.close();
    this.source = undefined;
  }

  clearTimers() {
    this.clearConnectionTimer();
    this.clearKeepAliveTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  clearConnectionTimer() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
  }

  clearKeepAliveTimer() {
    if (this.keepAliveTimer) {
      clearTimeout(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
  }
}

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

    return new ManagedEventSourceSubscription(
      this.createEventsUrl(gameId),
      this.EventSource,
      options
    );
  }
}
