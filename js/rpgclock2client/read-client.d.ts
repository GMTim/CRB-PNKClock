import type {
  ApiClientOptions,
  GameSummaryList,
  HealthResponse,
  RequestOptions,
  SubscribeOptions
} from "./types.js";
import { HttpClient } from "./core/http.js";

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
  subscribeToGameEvents(gameId: string, options?: SubscribeOptions): EventSource;
}
