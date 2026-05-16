export function now() {
  return Date.now();
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms));
}
