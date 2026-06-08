export function getAtPath(value: unknown, path: string): unknown {
  const segments = path.split('.').flatMap((part) => {
    const parsed: Array<string | number | { _key: string }> = [];
    const [property] = part.split('[', 1);

    if (property) {
      parsed.push(property);
    }

    for (const match of part.matchAll(/\[([^\]]+)\]/g)) {
      const token = match[1];
      const keyMatch = token.match(/_key\s*={1,2}\s*["']([^"']+)["']/);

      if (keyMatch) {
        parsed.push({ _key: keyMatch[1] });
        continue;
      }

      const index = Number(token);
      if (Number.isInteger(index)) {
        parsed.push(index);
      }
    }

    return parsed;
  });

  return segments.reduce((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof segment === 'object') {
      return Array.isArray(current)
        ? current.find((item) => item?._key === segment._key)
        : undefined;
    }

    return (current as Record<string | number, unknown>)[segment];
  }, value);
}
