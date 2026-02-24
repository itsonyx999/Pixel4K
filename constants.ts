export enum Tool {
  PEN = 'PEN',
  ERASER = 'ERASER',
  FILL = 'FILL',
  EYEDROPPER = 'EYEDROPPER'
}

export enum DitherMethod {
  NONE = 'None',
  // Error Diffusion
  FLOYD_STEINBERG = 'Floyd-Steinberg',
  FALSE_FLOYD_STEINBERG = 'False Floyd-Steinberg',
  ATKINSON = 'Atkinson',
  JARVIS_JUDICE_NINKE = 'Jarvis-Judice-Ninke',
  STUCKI = 'Stucki',
  BURKES = 'BurKES',
  SIERRA_3 = 'Sierra-3',
  SIERRA_2 = 'Sierra-2 (Two-Row)',
  SIERRA_LITE = 'Sierra Lite',
  // Ordered / Matrix
  BAYER_2X2 = 'Bayer 2x2',
  BAYER_4X4 = 'Bayer 4x4',
  BAYER_8X8 = 'Bayer 8x8',
  CLUSTER_4X4 = 'Cluster Dot 4x4 (Halftone)',
  CLUSTER_8X8 = 'Cluster Dot 8x8 (Halftone)',
  HORIZONTAL_LINES = 'Horizontal Lines',
  VERTICAL_LINES = 'Vertical Lines',
  DIAGONAL_LINES = 'Diagonal Lines',
  CROSSHATCH = 'Crosshatch',
  NOISE = 'White Noise'
}

export const DEFAULT_GRID_SIZE = 64;
export const MAX_GRID_SIZE = 128;
export const EXPORT_SIZE = 3840; // 4K Resolution

export const DEFAULT_PALETTE = [
  '#000000', '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
  '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f',
  '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2',
  '#566c86', '#333c57'
];

export const PRESET_PALETTES: Record<string, string[]> = {
  'Original': [], // Special case for keeping original colors
  'Vault 137': [
    '#07b7d5', '#009FFF', '#007aff', // Blue
    '#018281',                       // Teal
    '#c4f102', '#8af300', '#192f22', // Green
    '#ffd300', '#fcc245', '#fff845', // Yellow
    '#f37021', '#f96300',           // Orange
    '#e95a6f',                       // Salmon
    '#f50a1c', '#fe4d55',           // Red
    '#ff7bac', '#FF5BA8',           // Pink
    '#f806cc', '#933993',           // Magenta
    '#7f5cff', '#8216db',           // Purple
    '#a4b3dc', '#8586dc',           // Lavender
    '#231f20', '#080808', '#2c382a', // Black
    '#b2b3b4', '#2e3133',           // Grey
    '#fff6e7', '#e2e2e2'            // White
  ],
  'PICO-8': ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'],
  'Gameboy': ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  'Grayscale': ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
  '1-Bit': ['#000000', '#FFFFFF'],
  'CGA': ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF']
};

export interface PixelGrid {
  width: number;
  height: number;
  data: string[]; // Flat array of hex colors
}