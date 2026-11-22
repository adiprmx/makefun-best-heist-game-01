// Tuning for Velvet Vault — one place for every number the game balances on.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 72;
// The room the thief crosses: a fixed logical field, letterboxed to the window.
export const FIELD = { x: 20, y: 92, w: 1240, h: 688 };
export const THIEF_R = 14;
export const WALK_SPEED = 175;
export const SPRINT_MULT = 1.55;
export const GUARD_R = 15;
export const CONE_RANGE = 235;
export const CONE_HALF = 0.62; // radians, half-angle of a guard's vision cone
export const CAM_RANGE = 265;
export const CAM_HALF = 0.5;
export const ALARM_RISE = 45; // per second while any eye is on the thief
export const ALARM_FALL = 18; // per second while hidden
export const SMOKE_COUNT = 5; // smoke bombs per room
export const SMOKE_RADIUS = 150;
export const SMOKE_SECS = 4;
export const SMOKE_COST = 25; // score paid per bomb
export const LOOT_SCORE = 100;
export const LEVEL_BONUS = 250;
export const WIN_BONUS = 500;
export const MAX_LIVES = 3;
