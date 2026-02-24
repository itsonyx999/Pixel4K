import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import PixelCanvas from './components/PixelCanvas';
import { Tool, DEFAULT_GRID_SIZE, DEFAULT_PALETTE, EXPORT_SIZE } from './constants';
import { generatePixelArtFromPrompt } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [pixels, setPixels] = useState<string[]>(Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill(''));
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_PALETTE[3] || '#ffffff'); 
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.PEN);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<string[][]>([Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill('')]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Initialize pixels when grid size changes
  useEffect(() => {
    if (pixels.length !== gridSize * gridSize) {
        const newPixels = Array(gridSize * gridSize).fill('');
        setPixels(newPixels);
        setHistory([newPixels]);
        setHistoryIndex(0);
    }
  }, [gridSize]);

  // Wrapper for setPixels to handle history
  const handleSetPixels = useCallback((newPixels: string[]) => {
    setPixels(newPixels);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPixels);
    
    // Limit history size to 50
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPixels(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPixels(history[historyIndex + 1]);
    }
  };

  const handleClear = () => {
    const empty = Array(gridSize * gridSize).fill('');
    handleSetPixels(empty);
  };

  const handleImportConfirmed = (newPixels: string[], newSize: number) => {
      if (gridSize !== newSize) {
          setGridSize(newSize);
      }
      
      setTimeout(() => {
          setPixels(newPixels);
          setHistory([newPixels]);
          setHistoryIndex(0);
      }, 0);
  };

  const handleExport = () => {
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const pixelScale = EXPORT_SIZE / gridSize;
    ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    pixels.forEach((color, i) => {
      if (color && color !== 'transparent') {
        const x = (i % gridSize) * pixelScale;
        const y = Math.floor(i / gridSize) * pixelScale;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(pixelScale), Math.ceil(pixelScale));
      }
    });

    const link = document.createElement('a');
    link.download = `pixel-art-${gridSize}x${gridSize}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleGenerateAI = async (prompt: string) => {
    setIsGenerating(true);
    const newPixels = await generatePixelArtFromPrompt(prompt, gridSize);
    setIsGenerating(false);
    
    if (newPixels) {
      handleSetPixels(newPixels);
    } else {
      alert("AI generation failed. Please try a simpler prompt or check your connection.");
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
        e.preventDefault();
      }
      if (e.key === 'b') setCurrentTool(Tool.PEN);
      if (e.key === 'e') setCurrentTool(Tool.ERASER);
      if (e.key === 'f') setCurrentTool(Tool.FILL);
      if (e.key === 'i') setCurrentTool(Tool.EYEDROPPER);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <Header 
        gridSize={gridSize}
        setGridSize={setGridSize}
        onExport={handleExport}
        onImport={handleImportConfirmed}
        onClear={handleClear}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        onGenerateAI={handleGenerateAI}
        isGenerating={isGenerating}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Toolbar 
            currentTool={currentTool}
            setTool={setCurrentTool}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            palette={palette}
            setPalette={setPalette}
            orientation="vertical"
          />
        </div>

        <main className="flex-1 bg-slate-950 relative flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <PixelCanvas 
              gridSize={gridSize}
              pixels={pixels}
              setPixels={handleSetPixels}
              selectedColor={selectedColor}
              currentTool={currentTool}
              setSelectedColor={setSelectedColor}
              showGrid={showGrid}
            />
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden border-t border-slate-800 bg-slate-900 pb-safe">
        <Toolbar 
          currentTool={currentTool}
          setTool={setCurrentTool}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          palette={palette}
          setPalette={setPalette}
          orientation="horizontal"
        />
      </div>
    </div>
  );
};

export default App;