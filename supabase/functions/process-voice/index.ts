import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const formData = await req.formData()
    const audioFile = formData.get('file') as File
    const currentStep = formData.get('currentStep') || "0"
    const recipeContext = formData.get('recipeContext') // Stringified recipe data
    if (!audioFile) throw new Error("No audio file provided")

    // Log file details for debugging
    console.log(`Received file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);
    const API_KEY = Deno.env.get('GEMINI_API_KEY')
    const audioBase64 = encodeBase64(await audioFile.arrayBuffer())

    // 1. CALL GEMINI WITH AUDIO
    console.log("Sending audio to Gemini...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `You are a kitchen assistant for a user cooking a recipe. 
                     The user is on step ${currentStep}. 
                     Recipe Context: ${recipeContext}.
                     Listen to the audio and respond in JSON: 
                     {"action": "NEXT_STEP" | "PREVIOUS_STEP" | "NONE", "answer": "your short verbal response"}` },
            { inlineData: { mimeType: "audio/m4a", data: audioBase64 } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    })

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Gemini API Failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json()
    console.log("Gemini Response:", JSON.stringify(result));
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
         console.error("Invalid Gemini response structure:", result);
         throw new Error("Invalid response from Gemini");
    }

    const aiOutput = JSON.parse(result.candidates[0].content.parts[0].text)

    return new Response(JSON.stringify(aiOutput), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})

//     let action = null;
//     let answer = "I heard: " + text;

//     if (transcript.includes("next") || transcript.includes("continue")) {
//         action = "NEXT_STEP";
//         answer = "Moving to the next step.";
//     } else if (transcript.includes("repeat") || transcript.includes("back")) {
//         action = "PREVIOUS_STEP";
//         answer = "Going back one step.";
//     }

//     return new Response(JSON.stringify({ 
//         transcript: text,
//         action, 
//         answer 
//     }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: corsHeaders
//     })
//   }
// })