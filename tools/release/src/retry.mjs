const defaultRetryOptions = {
  attempts: 6,
  delayMs: 5_000,
  factor: 2,
  maxDelayMs: 30_000,
};

export function retry(operation, options = {}) {
  const attempts = options.attempts ?? defaultRetryOptions.attempts;
  const factor = options.factor ?? defaultRetryOptions.factor;
  const maxDelayMs = options.maxDelayMs ?? defaultRetryOptions.maxDelayMs;
  const sleep = options.sleep ?? sleepSync;
  let delayMs = options.delayMs ?? defaultRetryOptions.delayMs;
  let lastError;

  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error(
      `Retry attempts must be a positive integer, got ${attempts}.`,
    );
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return operation({ attempt, attempts });
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      sleep(delayMs);
      delayMs = Math.min(delayMs * factor, maxDelayMs);
    }
  }

  throw lastError;
}

function sleepSync(delayMs) {
  if (delayMs <= 0) {
    return;
  }

  // The release CLI is synchronous, so keep retry callers synchronous too.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
}
