import { PortableTextComponents } from '../../types';
import { defaultBlockStyles } from './blocks';
import { defaultLists } from './list';
import { DefaultListItem } from './list';
import { defaultMarks } from './marks';
import {
  DefaultUnknownMark,
  DefaultUnknownBlockStyle,
  DefaultUnknownList,
  DefaultUnknownListItem,
} from './unknown';
export const defaultComponents: PortableTextComponents = {
  types: {},

  block: defaultBlockStyles,
  marks: defaultMarks,
  list: defaultLists,
  listItem: DefaultListItem,

  unknownMark: DefaultUnknownMark,
  unknownList: DefaultUnknownList,
  unknownListItem: DefaultUnknownListItem,
  unknownBlockStyle: DefaultUnknownBlockStyle,
};
