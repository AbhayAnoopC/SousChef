// // 1. Add ThinkingLevel to your imports
// import { GoogleGenAI, ThinkingLevel } from "@google/genai"; 

// const API_KEY = "AIzaSyCRb68i8aWzjCU62iJdv3xGEmcxjwvDWHI";
// const ai = new GoogleGenAI({ apiKey: API_KEY });

// export const extractRecipeData = async (inputData: string, isUrl: boolean = true) => {
//   try {
//     const response = await ai.models.generateContent({
//       model: "gemini-3-flash-preview", 
//       contents: [{
//         role: "user",
//         parts: [{
//           text: `Extract recipe JSON from this ${isUrl ? "URL" : "text"}: ${inputData}. 
//           Strict JSON Schema: { "title": "string", "ingredients": [{"item": "string", "amount": "string", "unit": "string"}], "instructions": ["string"] }`
//         }]
//       }],
//       config: {
//         // 2. Use the Enum here instead of the string "low"
//         thinkingConfig: { 
//           includeThoughts: false, // Optional: keeps the response clean for JSON parsing
//           thinkingLevel: ThinkingLevel.LOW 
//         } 
//       }
//     });
//     // 1. Check if the text actually exists
//     if (!response.text) {
//       throw new Error("The AI returned an empty response. This link might be protected.");
//     }
//     const cleanedText = response.text
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();
//     return JSON.parse(cleanedText);
//   } catch (error) {
//     console.error("Gemini 3 Error:", error);
//     throw new Error("Unable to reach the chef's brain.");
//   }
// };

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const API_KEY = "AIzaSyCRb68i8aWzjCU62iJdv3xGEmcxjwvDWHI";
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
      
      // If it's a different error or we're out of retries, throw it
      throw error;
    }
  }
};