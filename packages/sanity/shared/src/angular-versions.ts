import { VERSION } from '@angular/core';

export function isAngularVersionLessThan19() {
  return Number(VERSION.major) < 19;
}
