import React, { useState, useRef, useEffect } from 'react';
import { Tool, PRESET_PALETTES } from '../constants';

// Icons
const Icons = {
  [Tool.PEN]: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  ),
  [Tool.ERASER]: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
    </svg>
  ),
  [Tool.FILL]: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  [Tool.EYEDROPPER]: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-2-2m2 2l2-2m0 0L5 13m10 10l-4-4m2-2l4-4m-2-2l-4-4m2 2l4 4M7 7l4 4M7 7l-2-2" />
    </svg>
  ),
};

interface ToolbarProps {
  currentTool: Tool;
  setTool: (tool: Tool) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  palette: string[];
  setPalette: (palette: string[]) => void;
  orientation: 'vertical' | 'horizontal';
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  selectedColor,
  setSelectedColor,
  palette,
  setPalette,
  orientation
}) => {
  const isVertical = orientation === 'vertical';
  const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          toggleBtnRef.current && !toggleBtnRef.current.contains(event.target as Node)) {
        setIsPaletteMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate position when menu opens
  useEffect(() => {
    if (isPaletteMenuOpen && toggleBtnRef.current) {
      const rect = toggleBtnRef.current.getBoundingClientRect();
      if (isVertical) {
        setMenuStyle({
          position: 'fixed',
          top: Math.max(10, Math.min(window.innerHeight - 300, rect.top)),
          left: rect.right + 12,
        });
      } else {
        setMenuStyle({
          position: 'fixed',
          bottom: (window.innerHeight - rect.top) + 12,
          left: Math.max(10, Math.min(window.innerWidth - 200, rect.left)),
        });
      }
    }
  }, [isPaletteMenuOpen, isVertical]);

  const handlePaletteSelect = (paletteName: string) => {
    const selectedPalette = PRESET_PALETTES[paletteName];
    if (selectedPalette && selectedPalette.length > 0) {
      setPalette(selectedPalette);
      setSelectedColor(selectedPalette[0]);
    }
    setIsPaletteMenuOpen(false);
  };

  return (
    <div className={`
      bg-slate-900 border-slate-800 flex shrink-0
      ${isVertical 
        ? 'flex-col h-full w-16 md:w-20 border-r pt-4 pb-4 items-center gap-6 overflow-y-auto scrollbar-hide' 
        : 'flex-row w-full h-16 md:h-auto items-center justify-between px-4 gap-4 overflow-x-hidden'
      }
    `}>
      {/* Tools Group */}
      <div className={`flex ${isVertical ? 'flex-col gap-3' : 'flex-row gap-2 md:gap-4'}`}>
        {Object.values(Tool).map((tool) => (
          <button
            key={tool}
            onClick={() => setTool(tool)}
            className={`p-2.5 rounded-xl transition-all duration-200 relative group ${
              currentTool === tool
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
            title={tool}
          >
            {Icons[tool]}
            {isVertical && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                    {tool}
                </div>
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className={`bg-slate-800 ${isVertical ? 'w-8 h-0.5' : 'w-0.5 h-8 shrink-0'}`}></div>

      {/* Color Section */}
      <div className={`flex ${isVertical ? 'flex-col gap-3 w-full items-center' : 'flex-row items-center gap-3 flex-1 overflow-hidden'}`}>
        
        {/* Current Color & Load Palette Toggle */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative shrink-0 group">
               <input 
                type="color" 
                value={selectedColor} 
                onChange={(e) => setSelectedColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div 
                  className={`rounded-full border-2 border-white shadow-md transition-transform active:scale-95 ${isVertical ? 'w-10 h-10' : 'w-9 h-9'}`} 
                  style={{ backgroundColor: selectedColor }}
              ></div>
               {isVertical && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                      Pick Custom Color
                  </div>
              )}
          </div>

          {/* Load Palette Button */}
          <div className="relative">
            <button
              ref={toggleBtnRef}
              onClick={() => setIsPaletteMenuOpen(!isPaletteMenuOpen)}
              className={`p-1.5 rounded-lg border transition-all ${isPaletteMenuOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
              title="Load Palette"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.01 5.01a15.998 15.998 0 011.62-3.388m4.56 0a4.5 4.5 0 01-8.4 2.245v.003a4.501 4.501 0 008.4-2.245zm0 0a15.998 15.998 0 003.388-1.62m-5.01 5.01a15.998 15.998 0 011.62-3.388m4.56 0a4.5 4.5 0 01-8.4 2.245v.003a4.501 4.501 0 008.4-2.245zM15 8.25a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Palette Selection Menu - Fixed Positioned */}
            {isPaletteMenuOpen && (
              <div 
                ref={menuRef}
                style={menuStyle}
                className={`
                  z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 w-48 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100
                `}
              >
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 mb-1">Select Palette</div>
                <div className="max-h-[250px] overflow-y-auto scrollbar-hide flex flex-col gap-1">
                  {Object.keys(PRESET_PALETTES).filter(name => name !== 'Original').map(paletteName => (
                    <button
                      key={paletteName}
                      onClick={() => handlePaletteSelect(paletteName)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors group"
                    >
                      <span className="text-sm text-slate-300 group-hover:text-white">{paletteName}</span>
                      <div className="flex -space-x-1">
                        {PRESET_PALETTES[paletteName].slice(0, 4).map((c, i) => (
                          <div key={i} className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: c }}></div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Palette Colors */}
        <div className={`
            flex scrollbar-hide
            ${isVertical 
                ? 'flex-col gap-2 w-full px-2 overflow-y-auto pb-4 items-center' 
                : 'flex-row gap-2 overflow-x-auto h-full items-center pr-2 mask-linear-fade'
            }
        `}>
            {palette.map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                onClick={() => setSelectedColor(color)}
                className={`
                    rounded-full border border-slate-700 transition-transform hover:scale-110 shrink-0
                    ${isVertical ? 'w-6 h-6' : 'w-7 h-7'}
                    ${selectedColor === color ? 'ring-2 ring-white scale-110 z-10' : ''}
                `}
                style={{ backgroundColor: color }}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;