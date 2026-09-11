/** Builds the plain `Request` objects that App Router handlers receive. */
export function jsonRequest(
  url: string,
  body: unknown,
  init: { method?: string; headers?: Record<string, string> } = {},
) {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", ...init.headers },
    body: JSON.stringify(body),
  });
}

export function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "GET", headers });
}

/** App Router hands dynamic segments to handlers as a promise. */
export function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}
