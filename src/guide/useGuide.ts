import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GUIDE_STEPS } from './steps';

interface GuideState {
  active: boolean;
  step: number;
  /** true once the tour has been finished or skipped — first run only starts once */
  seen: boolean;
  start: () => void;
  next: () => void;
  back: () => void;
  goto: (step: number) => void;
  end: () => void;
}

export const useGuide = create<GuideState>()(
  persist(
    (set, get) => ({
      active: false,
      step: 0,
      seen: false,

      start: () => set({ active: true, step: 0 }),
      next: () => {
        const step = get().step + 1;
        if (step >= GUIDE_STEPS.length) set({ active: false, step: 0, seen: true });
        else set({ step });
      },
      back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      goto: (step) => set({ step: Math.min(Math.max(0, step), GUIDE_STEPS.length - 1) }),
      end: () => set({ active: false, step: 0, seen: true }),
    }),
    { name: 'decision-maker:guide:v1' },
  ),
);
