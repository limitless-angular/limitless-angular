import { execFileSync } from 'node:child_process';

import { workspaceRoot } from './config.mjs';

export function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: { ...process.env, ...options.env },
    stdio: options.stdio ?? 'inherit',
  });
}

export function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}
