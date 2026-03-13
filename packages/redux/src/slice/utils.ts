import type { Slice } from '@reduxjs/toolkit';

import { TRRACKABLE, type TrrackableSlice } from './types';

export function isSliceTrrackable(
  slice: Slice,
): slice is TrrackableSlice<any, any> {
  return TRRACKABLE ? TRRACKABLE in slice : false;
}
