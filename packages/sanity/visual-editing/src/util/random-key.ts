function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

export function randomKey(length?: number): string {
  return Array.from(getRandomBytes(length ?? 16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
    .join('')
    .slice(0, length);
}
