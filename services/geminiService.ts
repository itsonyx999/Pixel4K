import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePixelArtFromPrompt = async (
  prompt: string,
  size: number
): Promise<string[] | null> => {
  try {
    const model = "gemini-3-flash-preview";
    
    // We limit the size for AI generation to avoid token limits and ensure quality
    // 32x32 is a reasonable max for a single pass generation of array data
    const effectiveSize = Math.min(size, 32); 

    const response = await ai.models.generateContent({
      model,
      contents: `Generate a pixel art representation of: "${prompt}". 
      The grid size is ${effectiveSize}x${effectiveSize}.
      Return a flat JSON array of hexadecimal color strings (e.g., "#FF0000") representing the pixels row by row.
      Use standard hex codes. Use transparent pixels (null or empty string) if needed, but preferably a solid background color or a specific color.
      The array must have exactly ${effectiveSize * effectiveSize} elements.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: `A flat array of ${effectiveSize * effectiveSize} hex color codes.`
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const data = JSON.parse(jsonText);
    const generatedColors = data.colors;

    // If the requested size is different from effective size (e.g. user asked for 64 but we gen 32),
    // we need to scale it up manually, or just fail. 
    // For this MVP, we will only allow AI generation if the grid matches or we scale simplisticly (nearest neighbor).
    
    if (effectiveSize !== size) {
        // Simple nearest neighbor scaling up to match the current grid `size`
        const scale = Math.floor(size / effectiveSize);
        const scaledGrid: string[] = new Array(size * size).fill('#ffffff');
        
        for (let y = 0; y < effectiveSize; y++) {
            for (let x = 0; x < effectiveSize; x++) {
                const color = generatedColors[y * effectiveSize + x];
                // Fill the block
                for (let dy = 0; dy < scale; dy++) {
                    for (let dx = 0; dx < scale; dx++) {
                        const targetY = (y * scale) + dy;
                        const targetX = (x * scale) + dx;
                        if (targetY < size && targetX < size) {
                            scaledGrid[targetY * size + targetX] = color;
                        }
                    }
                }
            }
        }
        return scaledGrid;
    }

    return generatedColors;
  } catch (error) {
    console.error("Failed to generate pixel art:", error);
    return null;
  }
};