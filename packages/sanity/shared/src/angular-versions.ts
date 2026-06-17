import { VERSION } from '@angular/core';

export function isAngularVersionLessThan20() {
  return Number(VERSION.major) < 20;
}
