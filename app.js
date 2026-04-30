import { RPGClockReadClient } from "./js/rpgclock2client/index.js";

const BASE_URL = "https://rpgclockapi2.bunchofbull.net";
const GAME_ID = "639B1E2A-A56F-40D2-AF9D-EB5FAC7A0F1F";

const state = {
  client: null,
  eventSource: null,
  activeGame: null
};

const els = {
  statusLight: document.querySelector("#status-light"),
  statusText: document.querySelector("#status-text"),
  pageTitle: document.querySelector("#page-title"),
  gameTitle: document.querySelector("#game-title"),
  gameTagline: document.querySelector("#game-tagline"),
  clockGroups: document.querySelector("#clock-groups")
};

connectToGame();

function createClient() {
  state.client = new RPGClockReadClient({
    baseUrl: BASE_URL
  });

  return state.client;
}

function connectToGame() {
  closeFeed();
  const client = state.client || createClient();

  setStatus("scanning", "Opening feed");
  const eventSource = client.subscribeToGameEvents(GAME_ID, {
    onMessage: handleClockEvent,
    onError: () => setStatus("error", "Feed interrupted"),
    eventHandlers: {
      game: handleClockEvent,
      clocks: handleClockEvent,
      update: handleClockEvent
    }
  });

  eventSource.onopen = () => setStatus("live", "Live feed");
  state.eventSource = eventSource;
}

function handleClockEvent(event) {
  const payload = parsePayload(event.data);
  const game = payload && payload.payload ? payload.payload : payload;

  if (!game || !Array.isArray(game.clockGroups)) {
    return;
  }

  state.activeGame = game;
  renderGame(game);
  setStatus("live", "Live feed");
}

function parsePayload(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function renderGame(game) {
  const title = game.title || "Untitled run";
  els.pageTitle.textContent = title;
  els.gameTitle.textContent = title;
  els.gameTagline.textContent = game.tagline || "Incoming clock telemetry locked.";
  els.clockGroups.replaceChildren(
    ...game.clockGroups.map((group) => createGroupElement(group))
  );
}

function createGroupElement(group) {
  const section = document.createElement("section");
  section.className = "clock-group";
  section.setAttribute("aria-labelledby", `group-${group.id}`);

  const title = document.createElement("h3");
  title.id = `group-${group.id}`;
  title.textContent = group.title || "Clock bank";

  const grid = document.createElement("div");
  grid.className = "clock-grid";
  grid.append(...(group.clocks || []).map((clock) => createClockElement(clock)));

  section.append(title, grid);
  return section;
}

function createClockElement(clock) {
  const filledSegments = clampNumber(clock.filledSegments, 0, clock.totalSegments);
  const totalSegments = Math.max(1, Number(clock.totalSegments) || 1);
  const ratio = filledSegments / totalSegments;
  const color = normalizeColor(clock.color);
  const isBlackClock = isBlackColor(color);

  const article = document.createElement("article");
  article.className = "clock-card";
  if (isBlackClock) {
    article.classList.add("clock-card--black");
  }
  article.style.setProperty("--clock-color", isBlackClock ? "#f2f8ff" : color);
  article.style.setProperty("--clock-ratio", ratio.toFixed(3));

  const header = document.createElement("div");
  header.className = "clock-card__header";

  const title = document.createElement("h4");
  title.textContent = clock.title || "Untitled clock";

  const count = document.createElement("span");
  count.className = "clock-count";
  count.textContent = `${filledSegments}/${totalSegments}`;

  const segments = document.createElement("div");
  segments.className = "segment-strip";
  segments.setAttribute("aria-label", `${filledSegments} of ${totalSegments} segments filled`);

  for (let index = 0; index < totalSegments; index += 1) {
    const segment = document.createElement("span");
    segment.className = index < filledSegments ? "segment is-active" : "segment";
    segment.style.setProperty("--segment-index", index);
    segments.append(segment);
  }

  const meter = document.createElement("div");
  meter.className = "signal-meter";
  meter.append(createDigit(String(filledSegments).padStart(2, "0")), createDigit(String(totalSegments).padStart(2, "0")));

  header.append(title, count);
  article.append(header, segments, meter);
  return article;
}

function createDigit(value) {
  const span = document.createElement("span");
  span.className = "digital-number";
  span.textContent = value;
  return span;
}

function setStatus(kind, label) {
  els.statusLight.dataset.status = kind;
  els.statusText.textContent = label;
}

function closeFeed() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
}

function clampNumber(value, min, max) {
  const number = Number(value) || 0;
  return Math.min(Math.max(number, min), Math.max(min, max));
}

function normalizeColor(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "#00f6ff";
}

function isBlackColor(value) {
  const color = String(value).trim().toLowerCase();
  return color === "black" || color === "#000" || color === "#000000" || color === "rgb(0, 0, 0)" || color === "rgb(0,0,0)";
}
