import { PortableTextComponents } from '../../types';
import { defaultBlockStyles } from './blocks';
import { defaultLists } from './list';
import { DefaultListItem } from './list';
import { defaultMarks } from './marks';

export const defaultComponents: PortableTextComponents = {
  block: defaultBlockStyles,
  marks: defaultMarks,
  list: defaultLists,
  listItem: DefaultListItem,
};
