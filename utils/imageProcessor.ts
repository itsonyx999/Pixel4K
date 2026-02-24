import { DitherMethod } from "../constants";

// Utility functions for image processing

export const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Convert RGB to HSL for better perceptual matching
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

/**
 * Weighted nearest color finder
 * sensitivity (0 to 1): 
 * - 1.0: Strict RGB distance (Classic)
 * - 0.0: High Hue/Saturation weight, Low Luminance weight (Looser, clusters shades)
 */
const findNearestColorWeighted = (
  r: number, g: number, b: number, 
  palette: {r: number, g: number, b: number, hex: string, h: number, s: number, l: number}[],
  sensitivity: number
): {r: number, g: number, b: number, hex: string} => {
  let minDistance = Infinity;
  let nearest = palette[0];

  const sourceHsl = rgbToHsl(r, g, b);

  // Sensitivity maps to weights:
  // At 1.0 (Strict): RGB is king.
  // At 0.0 (Loose): Hue/Saturation are king, Luminance is ignored.
  const rgbWeight = Math.pow(sensitivity, 2); 
  const hslWeight = 1.0 - rgbWeight;
  
  // Hue is weighted heavily at low sensitivity to "group" shades together
  const hueWeight = 4.0; 
  const satWeight = 1.0;
  const lumWeight = sensitivity * 2.0; // Luminance importance drops with sensitivity

  for (const color of palette) {
    // 1. Standard RGB Euclidean Distance
    const distRgb = Math.sqrt((r - color.r)**2 + (g - color.g)**2 + (b - color.b)**2);

    // 2. Perceptual HSL Distance
    // Note: Hue is circular (0-360)
    let hueDiff = Math.abs(sourceHsl.h - color.h);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;
    
    const distHsl = Math.sqrt(
      (hueDiff * hueWeight)**2 + 
      ((sourceHsl.s - color.s) * satWeight)**2 + 
      ((sourceHsl.l - color.l) * lumWeight)**2
    );

    // Final combined distance
    const totalDist = (distRgb * rgbWeight) + (distHsl * hslWeight);

    if (totalDist < minDistance) {
      minDistance = totalDist;
      nearest = color;
    }
  }
  return nearest;
};

// --- Ordered Dithering Matrices ---
const bayer2x2 = [[1, 3], [4, 2]];
const bayer4x4 = [[1, 9, 3, 11], [13, 5, 15, 7], [4, 12, 2, 10], [16, 8, 14, 6]];
const bayer8x8 = [
    [ 1, 33,  9, 41,  3, 35, 11, 43],
    [49, 17, 57, 25, 51, 19, 59, 27],
    [13, 45,  5, 37, 15, 47,  7, 39],
    [61, 29, 53, 21, 63, 31, 55, 23],
    [ 4, 36, 12, 44,  2, 34, 10, 42],
    [52, 20, 60, 28, 50, 18, 58, 26],
    [16, 48,  8, 40, 14, 46,  6, 38],
    [64, 32, 56, 24, 62, 30, 54, 22]
];
const cluster4x4 = [[12, 5, 6, 13], [4, 0, 1, 7], [11, 3, 2, 8], [15, 10, 9, 14]];
const cluster8x8 = [
  [24, 10, 12, 26, 35, 47, 49, 37], [8, 0, 2, 14, 45, 59, 61, 49],
  [22, 6, 4, 16, 43, 57, 63, 51], [30, 20, 18, 28, 33, 41, 53, 39],
  [34, 46, 48, 36, 25, 11, 13, 27], [44, 58, 60, 50, 9, 1, 3, 15],
  [42, 56, 62, 52, 23, 7, 5, 17], [32, 40, 54, 38, 31, 21, 19, 29]
];
const horizontalLines = [[1, 1, 1, 1], [8, 8, 8, 8], [1, 1, 1, 1], [8, 8, 8, 8]];
const verticalLines = [[1, 8, 1, 8], [1, 8, 1, 8], [1, 8, 1, 8], [1, 8, 1, 8]];
const diagonalLines = [[8, 6, 4, 2], [6, 4, 2, 8], [4, 2, 8, 6], [2, 8, 6, 4]];
const crosshatch = [[1, 8, 1, 8], [8, 1, 8, 1], [1, 8, 1, 8], [8, 1, 8, 1]];

const getMatrixThreshold = (matrix: number[][], x: number, y: number): number => {
    const height = matrix.length;
    const width = matrix[0].length;
    const maxVal = width * height; 
    const val = matrix[y % height][x % width];
    return (val / maxVal) - 0.5;
};

export const processImageToPixels = async (
  file: File, 
  targetSize: number, 
  palette: string[],
  ditherMethod: DitherMethod = DitherMethod.NONE,
  ditherStrength: number = 1.0,
  addBorder: boolean = false,
  alphaThreshold: number = 128,
  brightness: number = 1.0,
  contrast: number = 1.0,
  saturation: number = 1.0,
  sensitivity: number = 1.0
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Could not get canvas context');
          return;
        }

        ctx.clearRect(0, 0, targetSize, targetSize);
        if (addBorder && targetSize > 4) {
            ctx.drawImage(img, 2, 2, targetSize - 4, targetSize - 4);
        } else {
            ctx.drawImage(img, 0, 0, targetSize, targetSize);
        }
        
        let imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        let data = imageData.data;

        // Manual Filter Application
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            let r = data[i], g = data[i + 1], b = data[i + 2];
            r *= brightness; g *= brightness; b *= brightness;
            r = (r - 128) * contrast + 128; g = (g - 128) * contrast + 128; b = (b - 128) * contrast + 128;
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray + (r - gray) * saturation; g = gray + (g - gray) * saturation; b = gray + (b - gray) * saturation;
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
        }

        if (addBorder && targetSize > 4) {
             ctx.putImageData(imageData, 0, 0);
             ctx.fillStyle = '#000000';
             ctx.fillRect(0, 0, targetSize, 2);
             ctx.fillRect(0, targetSize - 2, targetSize, 2);
             ctx.fillRect(0, 2, 2, targetSize - 4);
             ctx.fillRect(targetSize - 2, 2, 2, targetSize - 4);
             imageData = ctx.getImageData(0, 0, targetSize, targetSize);
             data = imageData.data;
        }

        const pixels: string[] = new Array(targetSize * targetSize).fill('');
        const usePalette = palette.length > 0;

        if (!usePalette) {
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] >= alphaThreshold) pixels[i / 4] = rgbToHex(data[i], data[i+1], data[i+2]);
            }
            resolve(pixels);
            return;
        }

        // Pre-parse palette with HSL for better sensitivity mapping
        const paletteData = palette.map(hex => {
            const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            return { ...rgb, ...hsl, hex };
        });

        const width = targetSize, height = targetSize;
        const idx = (x: number, y: number) => (y * width + x) * 4;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = idx(x, y);
                if (data[i + 3] < alphaThreshold) continue;

                let oldR = data[i], oldG = data[i + 1], oldB = data[i + 2];

                // Sensitivity (Pre-mapping: Quantization for bolding colors)
                if (sensitivity < 1.0) {
                    const levels = Math.max(2, Math.round(Math.pow(2, 1 + sensitivity * 7)));
                    const step = 255 / (levels - 1);
                    oldR = Math.round(Math.round(oldR / step) * step);
                    oldG = Math.round(Math.round(oldG / step) * step);
                    oldB = Math.round(Math.round(oldB / step) * step);
                }

                // Ordered Dithering Thresholding
                let orderedThreshold = 0, isOrdered = false;
                switch (ditherMethod) {
                    case DitherMethod.NOISE: orderedThreshold = (Math.random() - 0.5); isOrdered = true; break;
                    case DitherMethod.BAYER_2X2: orderedThreshold = getMatrixThreshold(bayer2x2, x, y); isOrdered = true; break;
                    case DitherMethod.BAYER_4X4: orderedThreshold = getMatrixThreshold(bayer4x4, x, y); isOrdered = true; break;
                    case DitherMethod.BAYER_8X8: orderedThreshold = getMatrixThreshold(bayer8x8, x, y); isOrdered = true; break;
                    case DitherMethod.CLUSTER_4X4: orderedThreshold = getMatrixThreshold(cluster4x4, x, y); isOrdered = true; break;
                    case DitherMethod.CLUSTER_8X8: orderedThreshold = getMatrixThreshold(cluster8x8, x, y); isOrdered = true; break;
                    case DitherMethod.HORIZONTAL_LINES: orderedThreshold = getMatrixThreshold(horizontalLines, x, y); isOrdered = true; break;
                    case DitherMethod.VERTICAL_LINES: orderedThreshold = getMatrixThreshold(verticalLines, x, y); isOrdered = true; break;
                    case DitherMethod.DIAGONAL_LINES: orderedThreshold = getMatrixThreshold(diagonalLines, x, y); isOrdered = true; break;
                    case DitherMethod.CROSSHATCH: orderedThreshold = getMatrixThreshold(crosshatch, x, y); isOrdered = true; break;
                }

                if (isOrdered) {
                    const adj = orderedThreshold * 64 * ditherStrength;
                    oldR = Math.max(0, Math.min(255, oldR + adj));
                    oldG = Math.max(0, Math.min(255, oldG + adj));
                    oldB = Math.max(0, Math.min(255, oldB + adj));
                }

                // Weighted Quantization based on sensitivity
                const nearest = findNearestColorWeighted(oldR, oldG, oldB, paletteData, sensitivity);
                pixels[y * width + x] = nearest.hex;

                // Error Diffusion
                const isErrorDiffusion = [
                    DitherMethod.FLOYD_STEINBERG, DitherMethod.FALSE_FLOYD_STEINBERG,
                    DitherMethod.ATKINSON, DitherMethod.JARVIS_JUDICE_NINKE,
                    DitherMethod.STUCKI, DitherMethod.BURKES,
                    DitherMethod.SIERRA_3, DitherMethod.SIERRA_2, DitherMethod.SIERRA_LITE
                ].includes(ditherMethod);

                if (isErrorDiffusion) {
                    const errR = (oldR - nearest.r) * ditherStrength, errG = (oldG - nearest.g) * ditherStrength, errB = (oldB - nearest.b) * ditherStrength;
                    const distribute = (dx: number, dy: number, f: number) => {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const ni = idx(nx, ny);
                            data[ni] += errR * f; data[ni + 1] += errG * f; data[ni + 2] += errB * f;
                        }
                    };
                    switch (ditherMethod) {
                        case DitherMethod.FLOYD_STEINBERG: distribute(1, 0, 7/16); distribute(-1, 1, 3/16); distribute(0, 1, 5/16); distribute(1, 1, 1/16); break;
                        case DitherMethod.FALSE_FLOYD_STEINBERG: distribute(1, 0, 3/8); distribute(0, 1, 3/8); distribute(1, 1, 2/8); break;
                        case DitherMethod.ATKINSON: distribute(1, 0, 1/8); distribute(2, 0, 1/8); distribute(-1, 1, 1/8); distribute(0, 1, 1/8); distribute(1, 1, 1/8); distribute(0, 2, 1/8); break;
                        case DitherMethod.JARVIS_JUDICE_NINKE: const jjn = 1/48; distribute(1, 0, 7*jjn); distribute(2, 0, 5*jjn); distribute(-2, 1, 3*jjn); distribute(-1, 1, 5*jjn); distribute(0, 1, 7*jjn); distribute(1, 1, 5*jjn); distribute(-2, 2, 1*jjn); distribute(-1, 2, 3*jjn); distribute(0, 2, 5*jjn); distribute(1, 2, 3*jjn); break;
                        case DitherMethod.STUCKI: const st = 1/42; distribute(1, 0, 8*st); distribute(2, 0, 4*st); distribute(-2, 1, 2*st); distribute(-1, 1, 4*st); distribute(0, 1, 8*st); distribute(1, 1, 4*st); distribute(-2, 2, 1*st); distribute(-1, 2, 2*st); distribute(0, 2, 4*st); distribute(1, 2, 2*st); break;
                        case DitherMethod.BURKES: const bk = 1/32; distribute(1, 0, 8*bk); distribute(2, 0, 4*bk); distribute(-2, 1, 2*bk); distribute(-1, 1, 4*bk); distribute(0, 1, 8*bk); distribute(1, 1, 4*bk); break;
                        case DitherMethod.SIERRA_3: const s3 = 1/32; distribute(1, 0, 5*s3); distribute(2, 0, 3*s3); distribute(-2, 1, 2*s3); distribute(-1, 1, 4*s3); distribute(0, 1, 5*s3); distribute(1, 1, 4*s3); distribute(-1, 2, 2*s3); distribute(0, 2, 3*s3); distribute(1, 2, 2*s3); break;
                        case DitherMethod.SIERRA_2: const s2 = 1/16; distribute(1, 0, 4*s2); distribute(2, 0, 3*s2); distribute(-2, 1, 1*s2); distribute(-1, 1, 2*s2); distribute(0, 1, 3*s2); distribute(1, 1, 2*s2); distribute(2, 1, 1*s2); break;
                        case DitherMethod.SIERRA_LITE: distribute(1, 0, 2/4); distribute(-1, 1, 1/4); distribute(0, 1, 1/4); break;
                    }
                }
            }
        }
        resolve(pixels);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};