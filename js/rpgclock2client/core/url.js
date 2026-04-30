export function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function buildUrl(baseUrl, path, query) {
  const url = new URL(`${trimTrailingSlash(baseUrl)}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export function encodePathSegment(value, name = "path segment") {
  if (value === undefined || value === null || value === "") {
    throw new TypeError(`${name} is required.`);
  }

  return encodeURIComponent(String(value));
}
