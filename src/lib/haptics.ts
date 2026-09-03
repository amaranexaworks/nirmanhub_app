import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Safe haptic helpers — no-op on web/unsupported platforms. */
export const haptic = {
  light: () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined),
  medium: () => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined),
  heavy: () => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => undefined),
  select: () => Haptics.selectionStart().catch(() => undefined),
};
