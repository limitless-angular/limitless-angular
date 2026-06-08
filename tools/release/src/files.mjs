import { readFileSync, writeFileSync } from 'node:fs';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function writeText(path, value) {
  writeFileSync(path, value);
}
