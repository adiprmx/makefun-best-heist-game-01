// The three rooms of the heist. Each room names its solids (walls and crates
// block movement and sight), its guards (waypoint loops), its cameras (fixed,
// sweeping), its loot, where the thief slips in, where the exit is, and the
// route the autopilot walks for the screenshots. Coordinates are logical
// pixels in the 1280x800 field; patrol paths were drawn to stay clear of
// solids, and every loot sits on the route.

export const LEVELS = [
  {
    name: 'ROOM 1 — THE GALLERY',
    sub: 'Lift the three gallery gems, then slip out the east door.',
    solids: [
      { x: 300, y: 300, w: 60, h: 60, kind: 'pillar' },
      { x: 700, y: 450, w: 60, h: 60, kind: 'pillar' },
      { x: 980, y: 200, w: 60, h: 60, kind: 'pillar' },
      { x: 180, y: 500, w: 90, h: 50, kind: 'crate' },
      { x: 560, y: 140, w: 90, h: 50, kind: 'crate' },
      { x: 880, y: 560, w: 90, h: 50, kind: 'crate' },
      { x: 1150, y: 420, w: 70, h: 70, kind: 'crate' },
    ],
    guards: [
      { path: [[200, 260], [600, 260], [600, 420], [200, 420]], speed: 55 },
      { path: [[900, 300], [1100, 300], [1100, 600], [900, 600]], speed: 50 },
    ],
    cameras: [
      { x: 640, y: 100, base: Math.PI / 2, sweep: 0.9, speed: 0.45, phase: 0 },
    ],
    loot: [
      { x: 420, y: 320 },
      { x: 760, y: 620 },
      { x: 1150, y: 180 },
    ],
    spawn: { x: 80, y: 700 },
    exit: { x: 1236, y: 400, kind: 'door' },
    route: [[200, 640], [420, 320], [640, 580], [760, 620], [900, 500], [1050, 300], [1150, 180], [1236, 400]],
  },
  {
    name: 'ROOM 2 — THE VAULT HALL',
    sub: 'Two walled halls, four gems, and a camera watching the far door.',
    solids: [
      { x: 400, y: 92, w: 24, h: 300, kind: 'wall' },
      { x: 400, y: 540, w: 24, h: 240, kind: 'wall' },
      { x: 840, y: 92, w: 24, h: 250, kind: 'wall' },
      { x: 840, y: 480, w: 24, h: 300, kind: 'wall' },
      { x: 200, y: 300, w: 80, h: 50, kind: 'crate' },
      { x: 600, y: 620, w: 90, h: 50, kind: 'crate' },
      { x: 1000, y: 180, w: 80, h: 50, kind: 'crate' },
      { x: 1120, y: 690, w: 70, h: 60, kind: 'crate' },
    ],
    guards: [
      { path: [[150, 200], [350, 200], [350, 650], [150, 650]], speed: 60 },
      { path: [[500, 150], [780, 150], [780, 700], [500, 700]], speed: 58 },
      { path: [[950, 250], [1180, 250], [1180, 650], [950, 650]], speed: 62 },
    ],
    cameras: [
      { x: 640, y: 100, base: Math.PI / 2, sweep: 0.8, speed: 0.5, phase: 0 },
      { x: 1200, y: 772, base: -Math.PI / 2, sweep: 0.7, speed: 0.4, phase: 1.5 },
    ],
    loot: [
      { x: 300, y: 600 },
      { x: 620, y: 300 },
      { x: 880, y: 730 },
      { x: 1150, y: 150 },
    ],
    spawn: { x: 70, y: 400 },
    exit: { x: 1236, y: 400, kind: 'door' },
    route: [[250, 260], [320, 420], [300, 600], [460, 466], [620, 300], [800, 400], [852, 411], [895, 500], [880, 730], [1000, 400], [1150, 150], [1236, 400]],
  },
  {
    name: 'ROOM 3 — THE ROOFTOP',
    sub: 'Five gems under three cameras. Grab them all and reach the van.',
    solids: [
      { x: 300, y: 300, w: 120, h: 40, kind: 'wall' },
      { x: 800, y: 200, w: 40, h: 200, kind: 'wall' },
      { x: 600, y: 550, w: 160, h: 40, kind: 'wall' },
      { x: 1050, y: 470, w: 40, h: 160, kind: 'wall' },
      { x: 480, y: 240, w: 80, h: 50, kind: 'crate' },
      { x: 160, y: 580, w: 80, h: 50, kind: 'crate' },
      { x: 900, y: 680, w: 90, h: 50, kind: 'crate' },
      { x: 300, y: 650, w: 70, h: 60, kind: 'crate' },
    ],
    guards: [
      { path: [[150, 180], [600, 180], [600, 500], [150, 500]], speed: 50 },
      { path: [[700, 150], [1150, 150], [1150, 450], [700, 450]], speed: 48 },
      { path: [[250, 620], [1000, 620], [1000, 740], [250, 740]], speed: 50 },
    ],
    cameras: [
      { x: 640, y: 100, base: Math.PI / 2, sweep: 0.9, speed: 0.5, phase: 0 },
      { x: 1230, y: 400, base: Math.PI / 2, sweep: 0.5, speed: 0.4, phase: 1 },
    ],
    loot: [
      { x: 350, y: 250 },
      { x: 650, y: 700 },
      { x: 900, y: 300 },
      { x: 1150, y: 550 },
      { x: 120, y: 400 },
    ],
    spawn: { x: 70, y: 600 },
    exit: { x: 1200, y: 120, kind: 'van' },
    route: [[120, 400], [350, 250], [500, 550], [650, 700], [800, 500], [900, 300], [1000, 650], [1120, 700], [1150, 550], [1200, 120]],
  },
];
