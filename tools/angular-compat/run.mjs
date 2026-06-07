import { run } from './lib.mjs';

run('node', ['tools/angular-compat/assert-peer-matrix.mjs']);
run('node', ['tools/angular-compat/pack.mjs']);
run('node', ['tools/angular-compat/assert-artifact.mjs']);
run('node', ['tools/angular-compat/test-consumer.mjs']);
