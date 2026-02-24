import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- CONSTANTS ---
export enum Tool {
  PEN = 'PEN',
  ERASER = 'ERASER',
  FILL = 'FILL',
  EYEDROPPER = 'EYEDROPPER'
}

export enum DitherMethod {
  NONE = 'None',
  FLOYD_STEINBERG = 'Floyd-Steinberg',
  FALSE_FLOYD_STEINBERG = 'False Floyd-Steinberg',
  ATKINSON = 'Atkinson',
  JARVIS_JUDICE_NINKE = 'Jarvis-Judice-Ninke',
  STUCKI = 'Stucki',
  BURKES = 'BurKES',
  SIERRA_3 = 'Sierra-3',
  SIERRA_2 = 'Sierra-2 (Two-Row)',
  SIERRA_LITE = 'Sierra Lite',
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
  'Original': [],
  'Vault 137': [
    '#07b7d5', '#009FFF', '#007aff', '#018281', '#c4f102', '#8af300', '#192f22',
    '#ffd300', '#fcc245', '#fff845', '#f37021', '#f96300', '#e95a6f', '#f50a1c',
    '#fe4d55', '#ff7bac', '#FF5BA8', '#f806cc', '#933993', '#7f5cff', '#8216db',
    '#a4b3dc', '#8586dc', '#231f20', '#080808', '#2c382a', '#b2b3b4', '#2e3133',
    '#fff6e7', '#e2e2e2'
  ],
  'PICO-8': ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'],
  'Gameboy': ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  'Grayscale': ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
  '1-Bit': ['#000000', '#FFFFFF'],
  'CGA': ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF']
};

// --- UTILS ---
export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  } else { h = s = 0; }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const rgbToHex = (r: number, g: number, b: number) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

const findNearestColorWeighted = (r: number, g: number, b: number, palette: any[], sensitivity: number) => {
  let minDistance = Infinity; let nearest = palette[0];
  const sourceHsl = rgbToHsl(r, g, b);
  const rgbWeight = Math.pow(sensitivity, 2); const hslWeight = 1.0 - rgbWeight;
  const hueWeight = 4.0; const satWeight = 1.0; const lumWeight = sensitivity * 2.0;
  for (const color of palette) {
    const distRgb = Math.sqrt((r - color.r)**2 + (g - color.g)**2 + (b - color.b)**2);
    let hueDiff = Math.abs(sourceHsl.h - color.h); if (hueDiff > 180) hueDiff = 360 - hueDiff;
    const distHsl = Math.sqrt((hueDiff * hueWeight)**2 + ((sourceHsl.s - color.s) * satWeight)**2 + ((sourceHsl.l - color.l) * lumWeight)**2);
    const totalDist = (distRgb * rgbWeight) + (distHsl * hslWeight);
    if (totalDist < minDistance) { minDistance = totalDist; nearest = color; }
  }
  return nearest;
};

const bayer2x2 = [[1, 3], [4, 2]];
const bayer4x4 = [[1, 9, 3, 11], [13, 5, 15, 7], [4, 12, 2, 10], [16, 8, 14, 6]];
const bayer8x8 = [[1,33,9,41,3,35,11,43],[49,17,57,25,51,19,59,27],[13,45,5,37,15,47,7,39],[61,29,53,21,63,31,55,23],[4,36,12,44,2,34,10,42],[52,20,60,28,50,18,58,26],[16,48,8,40,14,46,6,38],[64,32,56,24,62,30,54,22]];
const cluster4x4 = [[12, 5, 6, 13], [4, 0, 1, 7], [11, 3, 2, 8], [15, 10, 9, 14]];
const cluster8x8 = [[24,10,12,26,35,47,49,37],[8,0,2,14,45,59,61,49],[22,6,4,16,43,57,63,51],[30,20,18,28,33,41,53,39],[34,46,48,36,25,11,13,27],[44,58,60,50,9,1,3,15],[42,56,62,52,23,7,5,17],[32,40,54,38,31,21,19,29]];
const horizontalLines = [[1, 1, 1, 1], [8, 8, 8, 8], [1, 1, 1, 1], [8, 8, 8, 8]];
const verticalLines = [[1, 8, 1, 8], [1, 8, 1, 8], [1, 8, 1, 8], [1, 8, 1, 8]];
const diagonalLines = [[8, 6, 4, 2], [6, 4, 2, 8], [4, 2, 8, 6], [2, 8, 6, 4]];
const crosshatch = [[1, 8, 1, 8], [8, 1, 8, 1], [1, 8, 1, 8], [8, 1, 8, 1]];

const getMatrixThreshold = (matrix: number[][], x: number, y: number) => {
    const height = matrix.length; const width = matrix[0].length;
    const maxVal = width * height; const val = matrix[y % height][x % width];
    return (val / maxVal) - 0.5;
};

export const processImageToPixels = async (file: File, targetSize: number, palette: string[], ditherMethod: DitherMethod, ditherStrength: number, addBorder: boolean, alphaThreshold: number, brightness: number, contrast: number, saturation: number, sensitivity: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = targetSize; canvas.height = targetSize;
        const ctx = canvas.getContext('2d'); if (!ctx) { reject('Ctx fail'); return; }
        ctx.clearRect(0, 0, targetSize, targetSize);
        if (addBorder && targetSize > 4) { ctx.drawImage(img, 2, 2, targetSize - 4, targetSize - 4); } else { ctx.drawImage(img, 0, 0, targetSize, targetSize); }
        let imageData = ctx.getImageData(0, 0, targetSize, targetSize); let data = imageData.data;
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
             ctx.putImageData(imageData, 0, 0); ctx.fillStyle = '#000000';
             ctx.fillRect(0, 0, targetSize, 2); ctx.fillRect(0, targetSize - 2, targetSize, 2); ctx.fillRect(0, 2, 2, targetSize - 4); ctx.fillRect(targetSize - 2, 2, 2, targetSize - 4);
             imageData = ctx.getImageData(0, 0, targetSize, targetSize); data = imageData.data;
        }
        const pixels: string[] = new Array(targetSize * targetSize).fill('');
        if (palette.length === 0) {
            for (let i = 0; i < data.length; i += 4) { if (data[i + 3] >= alphaThreshold) pixels[i / 4] = rgbToHex(data[i], data[i+1], data[i+2]); }
            resolve(pixels); return;
        }
        const paletteData = palette.map(hex => {
            const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
            return { ...rgb, ...hsl, hex };
        });
        const width = targetSize, height = targetSize; const idx = (x: number, y: number) => (y * width + x) * 4;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = idx(x, y); if (data[i + 3] < alphaThreshold) continue;
                let oldR = data[i], oldG = data[i + 1], oldB = data[i + 2];
                if (sensitivity < 1.0) {
                    const levels = Math.max(2, Math.round(Math.pow(2, 1 + sensitivity * 7))); const step = 255 / (levels - 1);
                    oldR = Math.round(Math.round(oldR / step) * step); oldG = Math.round(Math.round(oldG / step) * step); oldB = Math.round(Math.round(oldB / step) * step);
                }
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
                    oldR = Math.max(0, Math.min(255, oldR + adj)); oldG = Math.max(0, Math.min(255, oldG + adj)); oldB = Math.max(0, Math.min(255, oldB + adj));
                }
                const nearest = findNearestColorWeighted(oldR, oldG, oldB, paletteData, sensitivity);
                pixels[y * width + x] = nearest.hex;
                const isErrorDiffusion = [DitherMethod.FLOYD_STEINBERG, DitherMethod.FALSE_FLOYD_STEINBERG, DitherMethod.ATKINSON, DitherMethod.JARVIS_JUDICE_NINKE, DitherMethod.STUCKI, DitherMethod.BURKES, DitherMethod.SIERRA_3, DitherMethod.SIERRA_2, DitherMethod.SIERRA_LITE].includes(ditherMethod);
                if (isErrorDiffusion) {
                    const errR = (oldR - nearest.r) * ditherStrength, errG = (oldG - nearest.g) * ditherStrength, errB = (oldB - nearest.b) * ditherStrength;
                    const distribute = (dx: number, dy: number, f: number) => {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const ni = idx(nx, ny); data[ni] += errR * f; data[ni + 1] += errG * f; data[ni + 2] += errB * f;
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
      img.onerror = reject; img.src = e.target?.result as string;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
};

// --- SERVICES ---
export const generatePixelArtFromPrompt = async (prompt: string, size: number): Promise<string[] | null> => {
    alert("AI Generation is disabled in this standalone version without an API key.");
    return null;
};

// --- COMPONENTS ---

const ImportModal: React.FC<{ file: File; onConfirm: (pixels: string[], size: number) => void; onCancel: () => void; initialSize: number; }> = ({ file, onConfirm, onCancel, initialSize }) => {
  const [size, setSize] = useState<number>(initialSize);
  const [selectedPaletteName, setSelectedPaletteName] = useState<string>('Vault 137');
  const [ditherMethod, setDitherMethod] = useState<DitherMethod>(DitherMethod.NONE);
  const [ditherStrength, setDitherStrength] = useState<number>(0.7);
  const [addBorder, setAddBorder] = useState<boolean>(true);
  const [alphaThreshold, setAlphaThreshold] = useState<number>(128);
  const [sensitivity, setSensitivity] = useState<number>(0.85);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.1);
  const [saturation, setSaturation] = useState<number>(1.2);
  const [previewPixels, setPreviewPixels] = useState<string[]>([]);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file); setOriginalImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const process = async () => {
      setIsProcessing(true);
      try {
        const palette = PRESET_PALETTES[selectedPaletteName];
        const pixels = await processImageToPixels(file, size, palette, ditherMethod, ditherStrength, addBorder, alphaThreshold, brightness, contrast, saturation, sensitivity);
        setPreviewPixels(pixels);
      } catch (error) { console.error("Error processing:", error); }
      finally { setIsProcessing(false); }
    };
    const timeoutId = setTimeout(process, 100); return () => clearTimeout(timeoutId);
  }, [file, size, selectedPaletteName, ditherMethod, ditherStrength, addBorder, alphaThreshold, brightness, contrast, saturation, sensitivity]);

  const renderPreviewCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || previewPixels.length === 0) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelSize = canvas.width / size;
    for(let y=0; y<size; y++) { for(let x=0; x<size; x++) { ctx.fillStyle = (x+y)%2 === 0 ? '#1e293b' : '#0f172a'; ctx.fillRect(x*pixelSize, y*pixelSize, pixelSize, pixelSize); } }
    previewPixels.forEach((color, i) => { if (color && color !== 'transparent') { const x = (i % size) * pixelSize; const y = Math.floor(i / size) * pixelSize; ctx.fillStyle = color; ctx.fillRect(x, y, pixelSize, pixelSize); } });
  }, [previewPixels, size]);

  const isPaletteMode = selectedPaletteName !== 'Original';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-0 md:border md:border-slate-700 md:rounded-2xl shadow-2xl w-full max-w-6xl max-h-screen md:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
             </div>
             <div><h2 className="text-lg font-bold text-white leading-none">Import Image</h2><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Convert to Pixel Art</p></div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="lg:w-3/5 bg-slate-950 flex flex-col p-6 border-r border-slate-800 relative">
            <div className="flex-1 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900/40 rounded-xl overflow-hidden border border-slate-800/50 shadow-inner">
                <canvas ref={renderPreviewCanvas} width={1024} height={1024} className="w-full h-full object-contain image-pixelated max-h-[40vh] lg:max-h-full" style={{ imageRendering: 'pixelated' }} />
                {isProcessing && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Processing...</span></div></div>}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] font-mono">
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"><span className="text-slate-500 uppercase">Output:</span><span className="text-white">{size}x{size} px</span></div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"><span className="text-slate-500 uppercase">Palette:</span><span className="text-indigo-400">{selectedPaletteName}</span></div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"><span className="text-slate-500 uppercase">Dither:</span><span className="text-emerald-400">{ditherMethod}</span></div>
            </div>
          </div>
          <div className="lg:w-2/5 overflow-y-auto scrollbar-hide bg-slate-900/50 flex flex-col">
            <div className="p-6 space-y-8 pb-10">
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Base Configuration</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2"><label className="text-sm font-bold text-slate-300">Target Resolution</label><span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{size}px</span></div>
                            <input type="range" min="8" max={MAX_GRID_SIZE} step="1" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <label className="group flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/40 cursor-pointer hover:bg-slate-800 transition-all hover:border-slate-600">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${addBorder ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>{addBorder && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M16.704 4.126a.75.75 0 01.03 1.06l-9 9a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.97 3.97 8.47-8.47a.75.75 0 011.06-.03z" clipRule="evenodd" /></svg>}</div>
                            <input type="checkbox" checked={addBorder} onChange={(e) => setAddBorder(e.target.checked)} className="hidden" /><span className="text-sm font-bold text-slate-300">Add 2px black border frame</span>
                        </label>
                    </div>
                </section>
                <hr className="border-slate-800" />
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Pre-Processing</h3>
                    <div className="grid grid-cols-1 gap-5 bg-slate-800/20 p-4 rounded-xl border border-slate-800/50">
                        <div><div className="flex justify-between mb-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase">Brightness</label><span className="text-[10px] font-mono text-indigo-400">{Math.round(brightness * 100)}%</span></div><input type="range" min="0" max="2" step="0.05" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" /></div>
                        <div><div className="flex justify-between mb-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase">Contrast</label><span className="text-[10px] font-mono text-indigo-400">{Math.round(contrast * 100)}%</span></div><input type="range" min="0" max="2" step="0.05" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" /></div>
                        <div><div className="flex justify-between mb-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase">Saturation</label><span className="text-[10px] font-mono text-indigo-400">{Math.round(saturation * 100)}%</span></div><input type="range" min="0" max="2" step="0.05" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" /></div>
                    </div>
                </section>
                <hr className="border-slate-800" />
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Color Mapping</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(PRESET_PALETTES).map(name => (
                                <button key={name} onClick={() => setSelectedPaletteName(name)} className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all ${selectedPaletteName === name ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                                    {name}<div className="flex gap-0.5 mt-2 h-1 rounded overflow-hidden">{PRESET_PALETTES[name].slice(0, 8).map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }}></div>)}</div>
                                </button>
                            ))}
                        </div>
                        <div className={`p-4 rounded-xl border transition-all ${isPaletteMode ? 'bg-indigo-600/5 border-indigo-500/20' : 'opacity-30 grayscale pointer-events-none'}`}>
                            <div className="flex justify-between items-center mb-3"><label className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">Sensitivity Logic</label><span className="text-xs font-mono text-indigo-400">{Math.round(sensitivity * 100)}%</span></div>
                            <input type="range" min="0" max="1" step="0.01" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                </section>
                <hr className="border-slate-800" />
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>Dithering</h3>
                    <div className={`space-y-4 ${isPaletteMode ? '' : 'opacity-30 pointer-events-none'}`}>
                        <select value={ditherMethod} onChange={(e) => setDitherMethod(e.target.value as DitherMethod)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                            {Object.values(DitherMethod).map(method => <option key={method} value={method}>{method}</option>)}
                        </select>
                        {ditherMethod !== DitherMethod.NONE && (
                            <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Pattern Intensity</label><span className="text-[10px] font-mono text-indigo-400">{Math.round(ditherStrength * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.05" value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>
                        )}
                    </div>
                </section>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-slate-700 overflow-hidden bg-slate-800"><img src={originalImageUrl} alt="Src" className="w-full h-full object-cover" /></div>
                <div><p className="text-xs font-bold text-white max-w-[150px] truncate">{file.name}</p><p className="text-[10px] text-slate-500 uppercase">Source Image</p></div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Cancel</button>
                <button onClick={() => onConfirm(previewPixels, size)} disabled={isProcessing || previewPixels.length === 0} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">Apply & Import</button>
            </div>
        </div>
      </div>
    </div>
  );
};

const PixelCanvas: React.FC<{ gridSize: number; pixels: string[]; setPixels: (pixels: string[]) => void; selectedColor: string; currentTool: Tool; setSelectedColor: (color: string) => void; showGrid: boolean; }> = ({ gridSize, pixels, setPixels, selectedColor, currentTool, setSelectedColor, showGrid }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null); const containerRef = useRef<HTMLDivElement>(null); const [isDrawing, setIsDrawing] = useState(false);
  const getIndex = (x: number, y: number) => y * gridSize + x;
  const getCoords = (index: number) => ({ x: index % gridSize, y: Math.floor(index / gridSize) });
  const floodFill = useCallback((startX: number, startY: number, targetColor: string, replacementColor: string, currentPixels: string[]) => {
    if (targetColor === replacementColor) return currentPixels;
    const newPixels = [...currentPixels]; const queue: [number, number][] = [[startX, startY]]; const visited = new Set<number>();
    while (queue.length > 0) {
      const [x, y] = queue.pop()!; const idx = getIndex(x, y);
      if (visited.has(idx) || x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (newPixels[idx] === targetColor) { newPixels[idx] = replacementColor; visited.add(idx); queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    }
    return newPixels;
  }, [gridSize]);

  const handleDraw = useCallback((clientX: number, clientY: number, isClick: boolean = false) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX / (canvas.width / gridSize));
    const y = Math.floor((clientY - rect.top) * scaleY / (canvas.height / gridSize));
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    const index = getIndex(x, y); const currentColor = pixels[index];
    if (currentTool === Tool.EYEDROPPER) { if (isClick) setSelectedColor(currentColor); return; }
    if (currentTool === Tool.FILL) { if (isClick) setPixels(floodFill(x, y, currentColor, selectedColor, pixels)); return; }
    const drawColor = currentTool === Tool.ERASER ? 'transparent' : selectedColor;
    if (pixels[index] !== drawColor) { const newPixels = [...pixels]; newPixels[index] = drawColor; setPixels(newPixels); }
  }, [currentTool, gridSize, pixels, selectedColor, setPixels, setSelectedColor, floodFill]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelSize = canvas.width / gridSize;
    for(let y=0; y<gridSize; y++) { for(let x=0; x<gridSize; x++) { ctx.fillStyle = (x+y)%2 === 0 ? '#1e293b' : '#0f172a'; ctx.fillRect(x*pixelSize, y*pixelSize, pixelSize, pixelSize); } }
    pixels.forEach((color, i) => { if (color && color !== 'transparent') { const { x, y } = getCoords(i); ctx.fillStyle = color; ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize); } });
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) { ctx.beginPath(); ctx.moveTo(i * pixelSize, 0); ctx.lineTo(i * pixelSize, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * pixelSize); ctx.lineTo(canvas.width, i * pixelSize); ctx.stroke(); }
    }
  }, [pixels, gridSize, showGrid]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full h-full overflow-hidden">
      <div className="shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-700 rounded-sm bg-slate-900 transition-all duration-300">
        <canvas ref={canvasRef} width={1024} height={1024} className="pixel-cursor touch-none block max-w-full max-h-[80vh] md:max-h-[85vh] object-contain aspect-square" style={{ width: 'min(90vw, 80vh)', height: 'min(90vw, 80vh)' }} onMouseDown={(e) => { setIsDrawing(true); handleDraw(e.clientX, e.clientY, true); }} onMouseMove={(e) => { if (isDrawing) handleDraw(e.clientX, e.clientY, false); }} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} onTouchStart={(e) => { setIsDrawing(true); handleDraw(e.touches[0].clientX, e.touches[0].clientY, true); }} onTouchMove={(e) => { if (isDrawing) handleDraw(e.touches[0].clientX, e.touches[0].clientY, false); }} onTouchEnd={() => setIsDrawing(false)} />
      </div>
    </div>
  );
};

const Toolbar: React.FC<{ currentTool: Tool; setTool: (tool: Tool) => void; selectedColor: string; setSelectedColor: (color: string) => void; palette: string[]; setPalette: (palette: string[]) => void; orientation: 'vertical' | 'horizontal'; }> = ({ currentTool, setTool, selectedColor, setSelectedColor, palette, setPalette, orientation }) => {
  const isVertical = orientation === 'vertical'; const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false); const menuRef = useRef<HTMLDivElement>(null); const toggleBtnRef = useRef<HTMLButtonElement>(null); const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const Icons = {
    [Tool.PEN]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>,
    [Tool.ERASER]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" /></svg>,
    [Tool.FILL]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    [Tool.EYEDROPPER]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-2-2m2 2l2-2m0 0L5 13m10 10l-4-4m2-2l4-4m-2-2l-4-4m2 2l4 4M7 7l4 4M7 7l-2-2" /></svg>
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node) && toggleBtnRef.current && !toggleBtnRef.current.contains(event.target as Node)) setIsPaletteMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isPaletteMenuOpen && toggleBtnRef.current) {
      const rect = toggleBtnRef.current.getBoundingClientRect();
      if (isVertical) setMenuStyle({ position: 'fixed', top: Math.max(10, Math.min(window.innerHeight - 300, rect.top)), left: rect.right + 12 });
      else setMenuStyle({ position: 'fixed', bottom: (window.innerHeight - rect.top) + 12, left: Math.max(10, Math.min(window.innerWidth - 200, rect.left)) });
    }
  }, [isPaletteMenuOpen, isVertical]);

  return (
    <div className={`bg-slate-900 border-slate-800 flex shrink-0 ${isVertical ? 'flex-col h-full w-16 md:w-20 border-r pt-4 pb-4 items-center gap-6 overflow-y-auto scrollbar-hide' : 'flex-row w-full h-16 md:h-auto items-center justify-between px-4 gap-4 overflow-x-hidden'}`}>
      <div className={`flex ${isVertical ? 'flex-col gap-3' : 'flex-row gap-2 md:gap-4'}`}>
        {Object.values(Tool).map((tool) => (
          <button key={tool} onClick={() => setTool(tool)} className={`p-2.5 rounded-xl transition-all duration-200 relative group ${currentTool === tool ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`} title={tool}>{Icons[tool]}</button>
        ))}
      </div>
      <div className={`bg-slate-800 ${isVertical ? 'w-8 h-0.5' : 'w-0.5 h-8 shrink-0'}`}></div>
      <div className={`flex ${isVertical ? 'flex-col gap-3 w-full items-center' : 'flex-row items-center gap-3 flex-1 overflow-hidden'}`}>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative shrink-0 group">
               <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
               <div className={`rounded-full border-2 border-white shadow-md transition-transform active:scale-95 ${isVertical ? 'w-10 h-10' : 'w-9 h-9'}`} style={{ backgroundColor: selectedColor }}></div>
          </div>
          <div className="relative">
            <button ref={toggleBtnRef} onClick={() => setIsPaletteMenuOpen(!isPaletteMenuOpen)} className={`p-1.5 rounded-lg border transition-all ${isPaletteMenuOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`} title="Load Palette"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.01 5.01a15.998 15.998 0 011.62-3.388m4.56 0a4.5 4.5 0 01-8.4 2.245v.003a4.501 4.501 0 008.4-2.245zm0 0a15.998 15.998 0 003.388-1.62m-5.01 5.01a15.998 15.998 0 011.62-3.388m4.56 0a4.5 4.5 0 01-8.4 2.245v.003a4.501 4.501 0 008.4-2.245zM15 8.25a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
            {isPaletteMenuOpen && <div ref={menuRef} style={menuStyle} className={`z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 w-48 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100`}><div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 mb-1">Select Palette</div><div className="max-h-[250px] overflow-y-auto scrollbar-hide flex flex-col gap-1">{Object.keys(PRESET_PALETTES).filter(name => name !== 'Original').map(paletteName => (<button key={paletteName} onClick={() => { const sel = PRESET_PALETTES[paletteName]; if (sel && sel.length > 0) { setPalette(sel); setSelectedColor(sel[0]); } setIsPaletteMenuOpen(false); }} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors group"><span className="text-sm text-slate-300 group-hover:text-white">{paletteName}</span><div className="flex -space-x-1">{PRESET_PALETTES[paletteName].slice(0, 4).map((c, i) => (<div key={i} className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: c }}></div>))}</div></button>))}</div></div>}
          </div>
        </div>
        <div className={`flex scrollbar-hide ${isVertical ? 'flex-col gap-2 w-full px-2 overflow-y-auto pb-4 items-center' : 'flex-row gap-2 overflow-x-auto h-full items-center pr-2 mask-linear-fade'}`}>{palette.map((color, idx) => (<button key={`${color}-${idx}`} onClick={() => setSelectedColor(color)} className={`rounded-full border border-slate-700 transition-transform hover:scale-110 shrink-0 ${isVertical ? 'w-6 h-6' : 'w-7 h-7'} ${selectedColor === color ? 'ring-2 ring-white scale-110 z-10' : ''}`} style={{ backgroundColor: color }} />))}</div>
      </div>
    </div>
  );
};

const Header: React.FC<{ gridSize: number; setGridSize: (size: number) => void; onExport: () => void; onImport: (pixels: string[], size: number) => void; onClear: () => void; showGrid: boolean; setShowGrid: (show: boolean) => void; onGenerateAI: (prompt: string) => void; isGenerating: boolean; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; }> = ({ gridSize, setGridSize, onExport, onImport, onClear, showGrid, setShowGrid, onGenerateAI, isGenerating, canUndo, canRedo, onUndo, onRedo }) => {
  const [prompt, setPrompt] = useState(''); const [isPromptOpen, setIsPromptOpen] = useState(false); const [isMenuOpen, setIsMenuOpen] = useState(false); const [isCustomSizeOpen, setIsCustomSizeOpen] = useState(false); const [customSizeInput, setCustomSizeInput] = useState<string>('64'); const [importFile, setImportFile] = useState<File | null>(null); const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePromptSubmit = (e: React.FormEvent) => { e.preventDefault(); if (prompt.trim()) { onGenerateAI(prompt); setIsPromptOpen(false); setPrompt(''); } };
  const handleCustomSizeSubmit = (e: React.FormEvent) => { e.preventDefault(); const size = parseInt(customSizeInput); if (!isNaN(size) && size > 0 && size <= MAX_GRID_SIZE) { setGridSize(size); setIsCustomSizeOpen(false); setIsMenuOpen(false); } else { alert(`Max ${MAX_GRID_SIZE}`); } };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setImportFile(file); if (e.target) e.target.value = ''; setIsMenuOpen(false); };
  const standardSizes = [8, 16, 32, 64, 128]; const isCustomSize = !standardSizes.includes(gridSize);

  return (
    <>
    <header className="h-14 md:h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-sm relative">
      <div className="flex items-center gap-2"><div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20"><span className="font-bold text-white text-[10px] md:text-xs">4K</span></div><h1 className="hidden md:block font-bold text-lg tracking-tight text-slate-100">PixelStudio</h1></div>
      <div className="flex items-center gap-1 md:gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-800">
        <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 md:p-2 rounded-md transition-colors ${!canUndo ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
        <div className="w-px h-4 bg-slate-700"></div>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 md:p-2 rounded-md transition-colors ${!canRedo ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></button>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button onClick={() => setIsPromptOpen(!isPromptOpen)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold text-xs md:text-sm transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95" disabled={isGenerating}>
            {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6.97 15.03a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>}
            <span className="hidden md:inline">AI Generate</span><span className="md:hidden">AI</span>
        </button>
        <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
            {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">Resolution</label>
                        <select value={isCustomSize ? "custom" : gridSize} onChange={(e) => { if (e.target.value === 'custom') { setCustomSizeInput(gridSize.toString()); setIsCustomSizeOpen(true); } else { setGridSize(Number(e.target.value)); } }} className="bg-slate-800 text-sm text-white rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 w-full mb-2">
                            <option value={8}>8x8 (Tiny)</option><option value={16}>16x16 (Classic)</option><option value={32}>32x32 (Detail)</option><option value={64}>64x64 (HD)</option><option value={128}>128x128 (Ultra)</option><option value="custom">Custom...</option>
                        </select>
                        <div className="flex items-center justify-between"><span className="text-sm text-slate-300">Show Grid</span><button onClick={() => setShowGrid(!showGrid)} className={`w-10 h-5 rounded-full relative transition-colors ${showGrid ? 'bg-indigo-600' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showGrid ? 'translate-x-5' : ''}`}></div></button></div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors text-left"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Import Image</button>
                    <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors text-left"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Export 4K</button>
                    <button onClick={() => { onClear(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm transition-colors text-left border-t border-slate-800 mt-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>Clear Canvas</button>
                </div>
            )}
        </div>
      </div>
      {isPromptOpen && (
            <div className="absolute top-16 right-4 w-72 md:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 z-40">
                <form onSubmit={handlePromptSubmit}>
                    <div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-slate-400 uppercase">AI Generator</label><button type="button" onClick={() => setIsPromptOpen(false)} className="text-slate-500 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3 resize-none h-24 placeholder:text-slate-600" placeholder="e.g. A retro cyberpunk robot..." autoFocus />
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">Generate Pixel Art</button>
                </form>
            </div>
      )}
      {isCustomSizeOpen && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95">
                    <h2 className="text-lg font-bold text-white mb-4">Custom Grid Size</h2>
                    <form onSubmit={handleCustomSizeSubmit}>
                        <div className="mb-4"><label className="block text-xs text-slate-400 uppercase font-bold mb-2">Size (max {MAX_GRID_SIZE})</label><div className="flex items-center gap-2"><input type="number" min="1" max={MAX_GRID_SIZE} value={customSizeInput} onChange={(e) => setCustomSizeInput(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" autoFocus /><span className="text-slate-500">px</span></div></div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCustomSizeOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-95">Set Size</button></div>
                    </form>
                </div>
             </div>
      )}
      {importFile && <ImportModal file={importFile} onConfirm={(px, sz) => { onImport(px, sz); setImportFile(null); }} onCancel={() => setImportFile(null)} initialSize={gridSize} />}
    </header>
    </>
  );
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [pixels, setPixels] = useState<string[]>(Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill(''));
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PALETTE[3] || '#ffffff');
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.PEN);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [history, setHistory] = useState<string[][]>([Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill('')]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  useEffect(() => { if (pixels.length !== gridSize * gridSize) { const newPixels = Array(gridSize * gridSize).fill(''); setPixels(newPixels); setHistory([newPixels]); setHistoryIndex(0); } }, [gridSize]);

  const handleSetPixels = useCallback((newPixels: string[]) => {
    setPixels(newPixels); const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newPixels); if (newHistory.length > 50) newHistory.shift(); setHistory(newHistory); setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setPixels(history[historyIndex - 1]); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setPixels(history[historyIndex + 1]); } };

  const handleExport = () => {
    const canvas = document.createElement('canvas'); canvas.width = EXPORT_SIZE; canvas.height = EXPORT_SIZE; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pixelScale = EXPORT_SIZE / gridSize; ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
    pixels.forEach((color, i) => { if (color && color !== 'transparent') { const x = (i % gridSize) * pixelScale; const y = Math.floor(i / gridSize) * pixelScale; ctx.fillStyle = color; ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(pixelScale), Math.ceil(pixelScale)); } });
    const link = document.createElement('a'); link.download = `pixel-art-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  };

  const handleGenerateAI = async (prompt: string) => {
    setIsGenerating(true); const newPixels = await generatePixelArtFromPrompt(prompt, gridSize); setIsGenerating(false);
    if (newPixels) handleSetPixels(newPixels); else alert("AI failed.");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'z') { if (e.shiftKey) redo(); else undo(); e.preventDefault(); } if (e.key === 'b') setCurrentTool(Tool.PEN); if (e.key === 'e') setCurrentTool(Tool.ERASER); if (e.key === 'f') setCurrentTool(Tool.FILL); if (e.key === 'i') setCurrentTool(Tool.EYEDROPPER); };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <Header gridSize={gridSize} setGridSize={setGridSize} onExport={handleExport} onImport={(px, sz) => { if (gridSize !== sz) setGridSize(sz); setTimeout(() => { setPixels(px); setHistory([px]); setHistoryIndex(0); }, 0); }} onClear={() => handleSetPixels(Array(gridSize * gridSize).fill(''))} showGrid={showGrid} setShowGrid={setShowGrid} onGenerateAI={handleGenerateAI} isGenerating={isGenerating} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1} onUndo={undo} onRedo={redo} />
      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden md:flex"><Toolbar currentTool={currentTool} setTool={setCurrentTool} selectedColor={selectedColor} setSelectedColor={setSelectedColor} palette={palette} setPalette={setPalette} orientation="vertical" /></div>
        <main className="flex-1 bg-slate-950 relative flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <PixelCanvas gridSize={gridSize} pixels={pixels} setPixels={handleSetPixels} selectedColor={selectedColor} currentTool={currentTool} setSelectedColor={setSelectedColor} showGrid={showGrid} />
        </main>
      </div>
      <div className="md:hidden border-t border-slate-800 bg-slate-900 pb-safe"><Toolbar currentTool={currentTool} setTool={setCurrentTool} selectedColor={selectedColor} setSelectedColor={setSelectedColor} palette={palette} setPalette={setPalette} orientation="horizontal" /></div>
    </div>
  );
};

export default App;
