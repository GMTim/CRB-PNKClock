export interface ApiClientOptions {
  baseUrl?: string;
  token?: string;
  fetch?: typeof fetch;
  EventSource?: typeof EventSource;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface SubscribeOptions {
  eventHandlers?: Record<string, EventListenerOrEventListenerObject>;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  eventSourceOptions?: EventSourceInit;
  signal?: AbortSignal;
  connectionTimeoutMs?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  keepAliveTimeoutMs?: number;
}

export interface HealthResponse {
  ok: boolean;
}

export interface ErrorResponse {
  error: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
}

export interface Clock {
  id: string;
  title: string;
  color: string;
  filledSegments: number;
  totalSegments: number;
}

export interface ClockGroup {
  id: string;
  title: string;
  clocks: Clock[];
}

export interface Game {
  id: string;
  title: string;
  tagline: string;
  clockGroups: ClockGroup[];
}

export interface GameSummary {
  id: string;
  title: string;
}

export interface GameSummaryList {
  games: GameSummary[];
}

export interface BroadcastRequest {
  event?: string;
  payload: Game;
}

export interface BroadcastAcceptedResponse {
  accepted: boolean;
  clients: number;
  event: string;
  gameId: string;
  payload: Game;
}

export interface BroadcastUnchangedResponse extends BroadcastAcceptedResponse {
  sent: boolean;
  unchanged: boolean;
}
