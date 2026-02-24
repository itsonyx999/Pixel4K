import React, { useState, useRef } from 'react';
import { MAX_GRID_SIZE } from '../constants';
import ImportModal from './ImportModal';

interface HeaderProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  onExport: () => void;
  onImport: (pixels: string[], size: number) => void;
  onClear: () => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  onGenerateAI: (prompt: string) => void;
  isGenerating: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const Header: React.FC<HeaderProps> = ({
  gridSize,
  setGridSize,
  onExport,
  onImport,
  onClear,
  showGrid,
  setShowGrid,
  onGenerateAI,
  isGenerating,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const [prompt, setPrompt] = useState('');
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom Size State
  const [isCustomSizeOpen, setIsCustomSizeOpen] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState<string>('64');

  // Import Modal State
  const [importFile, setImportFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerateAI(prompt);
      setIsPromptOpen(false);
      setPrompt('');
    }
  };

  const handleCustomSizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseInt(customSizeInput);
    if (!isNaN(size) && size > 0 && size <= MAX_GRID_SIZE) {
      setGridSize(size);
      setIsCustomSizeOpen(false);
      setIsMenuOpen(false); // Close menu if open
    } else {
        alert(`Please enter a size between 1 and ${MAX_GRID_SIZE}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
    if (e.target) e.target.value = '';
    setIsMenuOpen(false);
  };

  const handleImportConfirm = (pixels: string[], size: number) => {
      onImport(pixels, size);
      setImportFile(null);
  };

  const standardSizes = [8, 16, 32, 64, 128];
  const isCustomSize = !standardSizes.includes(gridSize);

  return (
    <>
    <header className="h-14 md:h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-sm relative">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-white text-[10px] md:text-xs">4K</span>
        </div>
        <h1 className="hidden md:block font-bold text-lg tracking-tight text-slate-100">
          PixelStudio
        </h1>
      </div>

      {/* Center: Undo/Redo (Visible on Desktop and Mobile) */}
      <div className="flex items-center gap-1 md:gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-800">
        <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-1.5 md:p-2 rounded-md transition-colors ${!canUndo ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
        </button>
        <div className="w-px h-4 bg-slate-700"></div>
        <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 md:p-2 rounded-md transition-colors ${!canRedo ? 'text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* AI Gen Button */}
        <button
            onClick={() => setIsPromptOpen(!isPromptOpen)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold text-xs md:text-sm transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95"
            disabled={isGenerating}
        >
            {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6.97 15.03a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
            )}
            <span className="hidden md:inline">AI Generate</span>
            <span className="md:hidden">AI</span>
        </button>

        {/* Menu Toggle (contains Grid, Import, Export, Clear) */}
        <div className="relative">
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                    {/* Grid Controls */}
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">Resolution</label>
                        <div className="flex items-center justify-between">
                            <select
                                value={isCustomSize ? "custom" : gridSize}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setCustomSizeInput(gridSize.toString());
                                        setIsCustomSizeOpen(true);
                                    } else {
                                        setGridSize(Number(e.target.value));
                                    }
                                }}
                                className="bg-slate-800 text-sm text-white rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 w-full mr-2"
                            >
                                <option value={8}>8x8 (Tiny)</option>
                                <option value={16}>16x16 (Classic)</option>
                                <option value={32}>32x32 (Detail)</option>
                                <option value={64}>64x64 (HD)</option>
                                <option value={128}>128x128 (Ultra)</option>
                                <option value="custom">Custom...</option>
                            </select>
                        </div>
                         <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm text-slate-300">Show Grid</span>
                            <button 
                                onClick={() => setShowGrid(!showGrid)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${showGrid ? 'bg-indigo-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showGrid ? 'translate-x-5' : ''}`}></div>
                            </button>
                        </div>
                    </div>

                    {/* File Actions */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors text-left">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Import Image
                    </button>
                    <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors text-left">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Export 4K
                    </button>
                    <button onClick={() => { onClear(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm transition-colors text-left border-t border-slate-800 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Clear Canvas
                    </button>
                </div>
            )}
        </div>
      </div>

        {/* Prompt Dialog */}
        {isPromptOpen && (
            <div className="absolute top-16 right-4 w-72 md:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 z-40">
                <form onSubmit={handlePromptSubmit}>
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-xs font-bold text-slate-400 uppercase">AI Generator</label>
                         <button type="button" onClick={() => setIsPromptOpen(false)} className="text-slate-500 hover:text-white">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                         </button>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3 resize-none h-24 placeholder:text-slate-600"
                        placeholder="e.g. A retro cyberpunk robot..."
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">Generate Pixel Art</button>
                    </div>
                </form>
            </div>
        )}

        {/* Custom Size Dialog */}
        {isCustomSizeOpen && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95">
                    <h2 className="text-lg font-bold text-white mb-4">Custom Grid Size</h2>
                    <form onSubmit={handleCustomSizeSubmit}>
                        <div className="mb-4">
                            <label className="block text-xs text-slate-400 uppercase font-bold mb-2">Size (max {MAX_GRID_SIZE})</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1" 
                                    max={MAX_GRID_SIZE} 
                                    value={customSizeInput}
                                    onChange={(e) => setCustomSizeInput(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                                <span className="text-slate-500">px</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button 
                                type="button" 
                                onClick={() => setIsCustomSizeOpen(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-95"
                            >
                                Set Size
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        {/* Import Modal */}
        {importFile && (
            <ImportModal 
                file={importFile} 
                onConfirm={handleImportConfirm} 
                onCancel={() => setImportFile(null)} 
                initialSize={gridSize}
            />
        )}
    </header>
    </>
  );
};

export default Header;