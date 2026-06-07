import { assertCompatibilityConfig } from './lib.mjs';

const result = assertCompatibilityConfig();

process.stdout.write(JSON.stringify(result.consumerAngularMajors));
