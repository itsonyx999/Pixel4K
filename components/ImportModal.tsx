import React, { useState, useEffect, useCallback } from 'react';
import { MAX_GRID_SIZE, PRESET_PALETTES, DitherMethod } from '../constants';
import { processImageToPixels } from '../utils/imageProcessor';

interface ImportModalProps {
  file: File;
  onConfirm: (pixels: string[], size: number) => void;
  onCancel: () => void;
  initialSize: number;
}

const ImportModal: React.FC<ImportModalProps> = ({ file, onConfirm, onCancel, initialSize }) => {
  const [size, setSize] = useState<number>(initialSize);
  const [selectedPaletteName, setSelectedPaletteName] = useState<string>('Vault 137');
  const [ditherMethod, setDitherMethod] = useState<DitherMethod>(DitherMethod.NONE);
  const [ditherStrength, setDitherStrength] = useState<number>(0.7);
  const [addBorder, setAddBorder] = useState<boolean>(true);
  const [alphaThreshold, setAlphaThreshold] = useState<number>(128);
  const [sensitivity, setSensitivity] = useState<number>(0.85);
  
  // Pre-processing Adjustments
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.1);
  const [saturation, setSaturation] = useState<number>(1.2);

  const [previewPixels, setPreviewPixels] = useState<string[]>([]);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load original image for left pane
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Process image when settings change
  useEffect(() => {
    const process = async () => {
      setIsProcessing(true);
      try {
        const palette = PRESET_PALETTES[selectedPaletteName];
        const pixels = await processImageToPixels(
            file, size, palette, ditherMethod, ditherStrength, addBorder, alphaThreshold,
            brightness, contrast, saturation, sensitivity
        );
        setPreviewPixels(pixels);
      } catch (error) {
        console.error("Error processing image preview:", error);
      } finally {
        setIsProcessing(false);
      }
    };
    
    const timeoutId = setTimeout(process, 100);
    return () => clearTimeout(timeoutId);
  }, [file, size, selectedPaletteName, ditherMethod, ditherStrength, addBorder, alphaThreshold, brightness, contrast, saturation, sensitivity]);

  // Render the preview canvas
  const renderPreviewCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || previewPixels.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelSize = canvas.width / size;

    // Background pattern
    for(let y=0; y<size; y++) {
        for(let x=0; x<size; x++) {
             ctx.fillStyle = (x+y)%2 === 0 ? '#1e293b' : '#0f172a';
             ctx.fillRect(x*pixelSize, y*pixelSize, pixelSize, pixelSize);
        }
    }

    previewPixels.forEach((color, i) => {
      if (color && color !== 'transparent') {
        const x = (i % size) * pixelSize;
        const y = Math.floor(i / size) * pixelSize;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    });
  }, [previewPixels, size]);

  const isPaletteMode = selectedPaletteName !== 'Original';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-0 md:border md:border-slate-700 md:rounded-2xl shadow-2xl w-full max-w-6xl max-h-screen md:max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
             </div>
             <div>
                <h2 className="text-lg font-bold text-white leading-none">Import Image</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Convert to Pixel Art</p>
             </div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: Preview Pane (Fixed on Desktop) */}
          <div className="lg:w-3/5 bg-slate-950 flex flex-col p-6 border-r border-slate-800 relative">
            <div className="flex-1 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900/40 rounded-xl overflow-hidden border border-slate-800/50 shadow-inner">
                <canvas 
                    ref={renderPreviewCanvas} 
                    width={1024} 
                    height={1024} 
                    className="w-full h-full object-contain image-pixelated max-h-[40vh] lg:max-h-full"
                    style={{ imageRendering: 'pixelated' }}
                />
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Processing...</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Status Info Overlay */}
            <div className="mt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] font-mono">
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <span className="text-slate-500 uppercase">Output:</span>
                    <span className="text-white">{size}x{size} px</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <span className="text-slate-500 uppercase">Palette:</span>
                    <span className="text-indigo-400">{selectedPaletteName}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                    <span className="text-slate-500 uppercase">Dither:</span>
                    <span className="text-emerald-400">{ditherMethod}</span>
                </div>
            </div>
          </div>

          {/* Right: Controls Pane (Scrollable on Desktop) */}
          <div className="lg:w-2/5 overflow-y-auto scrollbar-hide bg-slate-900/50 flex flex-col">
            <div className="p-6 space-y-8 pb-10">
                
                {/* 1. Base Configuration */}
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Base Configuration
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-bold text-slate-300">Target Resolution</label>
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{size}px</span>
                            </div>
                            <input 
                                type="range" min="8" max={MAX_GRID_SIZE} step="1" 
                                value={size} onChange={(e) => setSize(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                                <span>8x8</span>
                                <span>{MAX_GRID_SIZE}x{MAX_GRID_SIZE}</span>
                            </div>
                        </div>

                        <label className="group flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/40 cursor-pointer hover:bg-slate-800 transition-all hover:border-slate-600">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${addBorder ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>
                                {addBorder && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white"><path fillRule="evenodd" d="M16.704 4.126a.75.75 0 01.03 1.06l-9 9a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 011.06-1.06l3.97 3.97 8.47-8.47a.75.75 0 011.06-.03z" clipRule="evenodd" /></svg>}
                            </div>
                            <input type="checkbox" checked={addBorder} onChange={(e) => setAddBorder(e.target.checked)} className="hidden" />
                            <span className="text-sm font-bold text-slate-300">Add 2px black border frame</span>
                        </label>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* 2. Image Pre-Processing */}
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pre-Processing
                    </h3>
                    <div className="grid grid-cols-1 gap-5 bg-slate-800/20 p-4 rounded-xl border border-slate-800/50">
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Brightness</label>
                                <span className="text-[10px] font-mono text-indigo-400">{Math.round(brightness * 100)}%</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.05" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Contrast</label>
                                <span className="text-[10px] font-mono text-indigo-400">{Math.round(contrast * 100)}%</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.05" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Saturation</label>
                                <span className="text-[10px] font-mono text-indigo-400">{Math.round(saturation * 100)}%</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.05" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* 3. Palette & Sensitivity */}
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Color Mapping
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(PRESET_PALETTES).map(name => (
                                <button
                                    key={name}
                                    onClick={() => setSelectedPaletteName(name)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all ${selectedPaletteName === name ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                >
                                    {name}
                                    <div className="flex gap-0.5 mt-2 h-1 rounded overflow-hidden">
                                        {PRESET_PALETTES[name].slice(0, 8).map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }}></div>)}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className={`p-4 rounded-xl border transition-all ${isPaletteMode ? 'bg-indigo-600/5 border-indigo-500/20' : 'opacity-30 grayscale pointer-events-none'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
                                    Sensitivity Logic
                                    <span className="text-[9px] font-normal text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Weighted</span>
                                </label>
                                <span className="text-xs font-mono text-indigo-400">{Math.round(sensitivity * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.01" 
                                value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="mt-3 text-[10px] leading-relaxed text-slate-500">
                                {sensitivity < 0.3 ? "Grouping colors by bold hue (Ideal for high-contrast sprites)." : 
                                 sensitivity > 0.8 ? "Strict matching (Best for portraits and photorealistic pixel art)." :
                                 "Balanced perceptual mapping for clean gradients."}
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* 4. Dithering */}
                <section>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                        Dithering
                    </h3>
                    <div className={`space-y-4 ${isPaletteMode ? '' : 'opacity-30 pointer-events-none'}`}>
                        <select 
                            value={ditherMethod}
                            onChange={(e) => setDitherMethod(e.target.value as DitherMethod)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            {Object.values(DitherMethod).map(method => <option key={method} value={method}>{method}</option>)}
                        </select>

                        {ditherMethod !== DitherMethod.NONE && (
                            <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Pattern Intensity</label>
                                    <span className="text-[10px] font-mono text-indigo-400">{Math.round(ditherStrength * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0" max="1" step="0.05" 
                                    value={ditherStrength} onChange={(e) => setDitherStrength(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                </section>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-slate-700 overflow-hidden bg-slate-800">
                    <img src={originalImageUrl} alt="Src" className="w-full h-full object-cover" />
                </div>
                <div>
                    <p className="text-xs font-bold text-white max-w-[150px] truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Source Image</p>
                </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(previewPixels, size)}
                    disabled={isProcessing || previewPixels.length === 0}
                    className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    Apply & Import
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ImportModal;