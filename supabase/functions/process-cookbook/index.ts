import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { recipeId, imagePaths } = await req.json()
    const API_KEY = Deno.env.get('GEMINI_API_KEY')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. DOWNLOAD IMAGE & CONVERT TO BASE64
    console.log(`Processing recipe ${recipeId} with image: ${imagePaths?.[0]}`);
    
    if (!imagePaths || !imagePaths.length) {
      throw new Error("No image paths provided in request");
    }

    const { data: blob, error: dlError } = await supabase.storage.from('cookbooks').download(imagePaths[0])
    if (dlError) {
      console.error("Storage download error:", dlError);
      throw dlError;
    }
    
    if (!blob) {
      throw new Error("Downloaded blob is empty/null");
    }
    console.log(`Downloaded image blob size: ${blob.size} bytes, type: ${blob.type}`);

    if (blob.size === 0) {
      throw new Error(`The file at '${imagePaths[0]}' is empty (0 bytes). Please check your client-side upload logic.`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64Image = encodeBase64(new Uint8Array(arrayBuffer));
    console.log(`Generated base64 length: ${base64Image.length}`);

    // 2. STEP ONE: GOOGLE VISION OCR (THE EYES)
    console.log("Starting OCR extraction...")
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    if (!cleanBase64 || cleanBase64.length === 0) {
      throw new Error("Base64 image content is empty");
    }
    // Log the first few chars to verify format
    console.log(`Base64 preview: ${cleanBase64.substring(0, 50)}...`);

    const requestBody = JSON.stringify({
      requests: [{
        image: { content: cleanBase64 },
        features: [{ type: "TEXT_DETECTION" }]
      }]
    });
    
    // Log body structure (without massive content) for debugging
    console.log("Request body structure:", JSON.stringify({
       requests: [{
        image: { content: `[BASE64_STRING_LEN_${cleanBase64.length}]` },
        features: [{ type: "TEXT_DETECTION" }]
      }]
    }));

    const visionResp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    })
    const visionData = await visionResp.json()
    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text

    if (!rawText) {
      console.error("Vision API Error Response:", JSON.stringify(visionData));
      throw new Error("OCR could not find any text or the response structure was unexpected.");
    }
    
    // Log the OCR output so we can confirm it worked
    console.log("OCR SUCCESS! Extracted Text Preview:", rawText.substring(0, 500));
    // 3. STEP TWO: GEMINI (THE BRAIN)
    console.log("Formatting text with Gemini...")
    const geminiPrompt = `
      Extract the title, ingredients, and instructions from this raw OCR text. 
      Return ONLY a JSON object. Do not include any conversational text.
      
      Format: {"title": "string", "ingredients": ["string"], "instructions": ["string"]}
      
      RAW TEXT:
      ${rawText}
    `

    const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    })

    const geminiData = await geminiResp.json()

    if (geminiData.error) {
      console.error("Gemini API Error:", JSON.stringify(geminiData.error));
      throw new Error(`Gemini API Error: ${geminiData.error.message}`);
    }

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      console.error("Gemini Response Structure:", JSON.stringify(geminiData));
      throw new Error("Gemini returned no candidates (possibly blocked by safety settings).");
    }

    const rawAiResponse = geminiData.candidates[0].content.parts[0].text;
    const jsonMatch = rawAiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini did not return a valid JSON object.");
    }

    const recipe = JSON.parse(jsonMatch[0]);


    // 4. UPDATE DATABASE
    console.log(`Updating database for recipe: ${recipeId}`);
    await supabase.from('recipes').update({
      title: recipe.title || "Untitled Recipe",
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      status: 'ready'
    }).eq('id', recipeId)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    // This logs the full object to the Supabase Console so you can see it
    console.error("Full Function Error Object:", error);

    // This ensures you get a readable string back in the response
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})