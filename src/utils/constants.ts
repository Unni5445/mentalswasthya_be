export const BREATHING_TECHNIQUES = ['4-7-8', '4-4-4-4', '4-4'] as const;
export type BreathingTechnique = (typeof BREATHING_TECHNIQUES)[number];

export const BREATHING_SHAPES = ['box', 'triangle', 'circle'] as const;
export type BreathingShape = (typeof BREATHING_SHAPES)[number];

export const SESSION_START_OPTIONS = ['first_login_of_day', 'every_login', 'manual'] as const;
export type SessionStartOption = (typeof SESSION_START_OPTIONS)[number];
