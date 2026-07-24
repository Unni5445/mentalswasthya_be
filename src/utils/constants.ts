export const BREATHING_TECHNIQUES = [
  '4-7-8', '4-4-8', '5-2-7',
  '4-4-4-4', '5-2-7-2', '4-4-6-2',
  '4-4', '5-7', '4-6',
  '4-7-8 Breathing', '4-4-8 Breathing', '5-2-7 Breathing',
  '4-4-4-4 Box Breathing', '5-2-7-2 Box Breathing', '4-4-6-2 Box Breathing',
  '4-4 Breathing', '5-7 Breathing', '4-6 Breathing',
  'triangle', 'Triangle', 'box', 'Box', 'circle', 'Circle'
] as const;
export type BreathingTechnique = string;

export const BREATHING_SHAPES = ['box', 'triangle', 'circle'] as const;
export type BreathingShape = (typeof BREATHING_SHAPES)[number];

export const SESSION_START_OPTIONS = ['first_login_of_day', 'every_login', 'manual'] as const;
export type SessionStartOption = (typeof SESSION_START_OPTIONS)[number];
