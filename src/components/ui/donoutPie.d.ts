import type { FC } from 'react';

export interface DonutPieAttribute {
  id?: number | string;
  value: number;
  label?: string;
}

declare const DonutPie: FC<{ attributes?: DonutPieAttribute[] }>;
export default DonutPie;
