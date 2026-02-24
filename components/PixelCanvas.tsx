import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tool } from '../constants';

interface PixelCanvasProps {
  gridSize: number;
  pixels: string[];
  setPixels: (pixels: string[]) => void;
  selectedColor: string;
  currentTool: Tool;
  setSelectedColor: (color: string) => void;
  showGrid: boolean;
}

const PixelCanvas: React.FC<PixelCanvasProps> = ({
  gridSize,
  pixels,
  setPixels,
  selectedColor,
  currentTool,
  setSelectedColor,
  showGrid
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Helper to get index from x, y
  const getIndex = (x: number, y: number) => y * gridSize + x;
  
  // Helper to get coordinates from index
  const getCoords = (index: number) => ({ x: index % gridSize, y: Math.floor(index / gridSize) });

  // Flood fill algorithm
  const floodFill = useCallback((startX: number, startY: number, targetColor: string, replacementColor: string, currentPixels: string[]) => {
    if (targetColor === replacementColor) return currentPixels;
    
    const newPixels = [...currentPixels];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const idx = getIndex(x, y);
      
      if (visited.has(idx)) continue;
      
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      
      if (newPixels[idx] === targetColor) {
        newPixels[idx] = replacementColor;
        visited.add(idx);
        
        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
      }
    }
    return newPixels;
  }, [gridSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDraw = useCallback((clientX: number, clientY: number, isClick: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX / (canvas.width / gridSize));
    const y = Math.floor((clientY - rect.top) * scaleY / (canvas.height / gridSize));

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;

    const index = getIndex(x, y);
    const currentColor = pixels[index];

    if (currentTool === Tool.EYEDROPPER) {
       // Only pick color on click/tap, not drag
       if (isClick) {
         setSelectedColor(currentColor);
       }
       return;
    }

    if (currentTool === Tool.FILL) {
      if (isClick) {
         const newPixels = floodFill(x, y, currentColor, selectedColor, pixels);
         setPixels(newPixels);
      }
      return;
    }

    // Pen and Eraser
    const drawColor = currentTool === Tool.ERASER ? 'transparent' : selectedColor;
    
    // Optimization: Don't update if color is same
    if (pixels[index] !== drawColor) {
      const newPixels = [...pixels];
      newPixels[index] = drawColor;
      setPixels(newPixels);
    }
  }, [currentTool, gridSize, pixels, selectedColor, setPixels, setSelectedColor, floodFill]);

  // Mouse Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    handleDraw(e.clientX, e.clientY, true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    handleDraw(e.clientX, e.clientY, false);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDrawing(true);
    const touch = e.touches[0];
    handleDraw(touch.clientX, touch.clientY, true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    handleDraw(touch.clientX, touch.clientY, false);
  };

  // Render the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Pixels
    const pixelSize = canvas.width / gridSize;

    // Draw checkered background for transparency
    for(let y=0; y<gridSize; y++) {
        for(let x=0; x<gridSize; x++) {
             if ((x+y)%2 === 0) {
                 ctx.fillStyle = '#1e293b'; // slate-800
             } else {
                 ctx.fillStyle = '#0f172a'; // slate-900
             }
             ctx.fillRect(x*pixelSize, y*pixelSize, pixelSize, pixelSize);
        }
    }

    // Draw Actual Pixels
    pixels.forEach((color, i) => {
      if (color && color !== 'transparent') {
        const { x, y } = getCoords(i);
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    });

    // Draw Grid Lines
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1; // logical pixel width
      
      // Vertical lines
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pixelSize, 0);
        ctx.lineTo(i * pixelSize, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * pixelSize);
        ctx.lineTo(canvas.width, i * pixelSize);
        ctx.stroke();
      }
    }

  }, [pixels, gridSize, showGrid]);

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
    >
      <div className="shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-700 rounded-sm bg-slate-900 transition-all duration-300">
        <canvas
          ref={canvasRef}
          width={1024} 
          height={1024}
          className="pixel-cursor touch-none block max-w-full max-h-[80vh] md:max-h-[85vh] object-contain aspect-square"
          style={{ width: 'min(90vw, 80vh)', height: 'min(90vw, 80vh)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        />
      </div>
    </div>
  );
};

export default PixelCanvas;