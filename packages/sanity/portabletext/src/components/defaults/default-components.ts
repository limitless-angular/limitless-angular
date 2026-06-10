/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/component-class-suffix */
import { Component } from '@angular/core';
import { PortableTextAngularComponents } from '../../types';
import { defaultBlockStyles } from './blocks';
import { defaultLists } from './list';
import { DefaultListItem } from './list';
import { defaultMarks } from './marks';
import {
  DefaultUnknownType,
  DefaultUnknownMark,
  DefaultUnknownBlockStyle,
  DefaultUnknownList,
  DefaultUnknownListItem,
} from './unknown';

@Component({
  selector: 'br',
  template: '',
})
export class DefaultHardBreak {}

export const defaultComponents: PortableTextAngularComponents = {
  types: {},

  block: defaultBlockStyles,
  marks: defaultMarks,
  list: defaultLists,
  listItem: DefaultListItem,
  hardBreak: DefaultHardBreak,

  unknownType: DefaultUnknownType,
  unknownMark: DefaultUnknownMark,
  unknownList: DefaultUnknownList,
  unknownListItem: DefaultUnknownListItem,
  unknownBlockStyle: DefaultUnknownBlockStyle,
};
