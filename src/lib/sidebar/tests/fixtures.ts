import { SIDEBAR_META_TYPE } from '../sidebarGroups';

export const metaEntry = (group: string, section = '') => ({
  id: SIDEBAR_META_TYPE,
  type: SIDEBAR_META_TYPE,
  props: {},
  config: { group, section },
});

export const tableEntry = { id: 'table-1', type: 'leadTable' };

export const page = (id: string, group = '', section = '', icon_name = 'Sparkles') => ({
  id,
  name: id,
  icon_name,
  config: group ? [tableEntry, metaEntry(group, section)] : [tableEntry],
});
