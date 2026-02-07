import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Do NOT hard-code API keys. Read from environment variables instead.
// Use a public-prefixed env var for client-safe keys (e.g. EXPO_PUBLIC_GEMINI_API_KEY)
// and a private one for server environments (e.g. GENERATIVE_API_KEY).
const API_KEY = process.env.GENERATIVE_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
if (!API_KEY) console.warn('No Gemini API key found in environment variables. Set GENERATIVE_API_KEY or EXPO_PUBLIC_GEMINI_API_KEY.');
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Utility for "waiting" between retries
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const extractRecipeData = async (inputData: string, isUrl: boolean = true, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{ text: `Extract recipe JSON: ${inputData}` }]
        }],
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      if (!response.text) throw new Error("Empty response");
      return JSON.parse(response.text.replace(/```json|```/g, "").trim());

    } catch (error: any) {
      // If the error is a 503 (Overloaded) and we have retries left
      if (error.status === 503 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s...
        console.warn(`Model overloaded. Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      if (error.status === 403) {
        throw new Error("API Key Revoked: Google flagged your key as leaked. Please generate a new one in AI Studio.");
    }
      
      // If it's a different error or we're out of retries, throw it
      throw error;
    } 
  }
};

export const processCookbookPhotos = async (imageUris: string[]) => {
  const imageParts = await Promise.all(
    imageUris.map(async (uri) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // IMPORTANT: Remove the "data:image/jpeg;base64," prefix
      const cleanBase64 = base64Data.split(",")[1];

      return {
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg",
        },
      };
    })
  );

  const prompt = `
    Analyze these cookbook photos. 
    1. Extract the Title, Ingredients (list), and Instructions (steps).
    2. If text spans across pages, merge it into a single logical recipe.
    3. Ignore handwriting or stains unless they are corrections to the recipe.
    Return ONLY JSON: { "title": "string", "ingredients": ["string"], "instructions": ["string"] }
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...imageParts // Passing the inlineData objects directly
          ],
        },
      ],
    });

    if (!result.text) throw new Error("Empty response from AI");

    const cleanedText = result.text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Gemini couldn't read those pages. Make sure the lighting is good!");
  }
};