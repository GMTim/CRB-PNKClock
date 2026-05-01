import type {
  ApiClientOptions,
  GameSummaryList,
  HealthResponse,
  RequestOptions,
  SubscribeOptions
} from "./types.js";
import { HttpClient } from "./core/http.js";

export class ManagedEventSourceSubscription {
  constructor(
    url: string,
    EventSourceImplementation: typeof EventSource,
    options?: SubscribeOptions
  );

  readonly readyState: number;
  readonly withCredentials: boolean;
  readonly url: string;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;

  addEventListener(
    eventName: string,
    handler: EventListenerOrEventListenerObject
  ): void;
  removeEventListener(
    eventName: string,
    handler: EventListenerOrEventListenerObject
  ): void;
  dispatchEvent(event: Event): boolean;
  close(): void;
}

export class RPGClockReadClient {
  constructor(options?: ApiClientOptions);

  baseUrl: string;
  http: HttpClient;
  EventSource?: typeof EventSource;
  readonly token?: string;

  setToken(token: string): void;
  clearToken(): void;
  getHealth(options?: RequestOptions): Promise<HealthResponse>;
  getGames(options?: RequestOptions): Promise<GameSummaryList>;
  createEventsUrl(gameId: string): string;
  subscribeToGameEvents(
    gameId: string,
    options?: SubscribeOptions
  ): ManagedEventSourceSubscription;
}
