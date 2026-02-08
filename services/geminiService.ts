
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Summarizes the lecture based on audio transcript or session notes.
 * In a real-world app, you'd send the audio file. Here we summarize the metadata.
 */
export async function summarizeLecture(title: string, slides: {description: string}[]): Promise<string> {
  const descriptions = slides.map(s => s.description).join('\n - ');
  const prompt = `
    You are an expert academic assistant. I just finished a lecture titled "${title}". 
    Below are the notes and observations I captured during the class:
    ${descriptions}
    
    Please provide a comprehensive summary including:
    1. Main Concepts
    2. Key Formulas or Definitions (if applicable)
    3. Action items or things to research further.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You create high-quality, structured study guides from classroom materials.",
    }
  });

  return response.text || "Could not generate lecture summary.";
}
