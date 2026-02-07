import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Convert ArrayBuffer -> Base64 safely in chunks to avoid call-stack issues
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // 32KB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req: Request)=> {
  // Handle CORS for the mobile app
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipeId, imagePaths } = await req.json()
    console.log(`Processing recipe: ${recipeId} with ${imagePaths?.length || 0} images`);

    // Initialize Supabase Admin Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate inputs
    if (!recipeId) throw new Error('Missing recipeId')
    if (!Array.isArray(imagePaths)) throw new Error('imagePaths must be an array')

    // 1. Download images from Storage and convert to Base64 for Gemini
    const imageParts = await Promise.all(
      imagePaths.map(async (path: string) => {
        console.log(`Downloading: ${path}`);
        const { data, error } = await supabase.storage.from('cookbooks').download(path)
        if (error) {
          console.error(`Storage Error for ${path}:`, error);
          throw error
        }

        const arrayBuffer = await data.arrayBuffer()
        const base64 = arrayBufferToBase64(arrayBuffer)

        return {
          inlineData: {
            data: base64,
            mimeType: "image/jpeg",
          },
        }
      })
    )

    console.log("Calling Gemini API...");
    // 2. Call Gemini 3 Flash
    const prompt = `
      Analyze the attached image(s). 
      1. Extract the title, ingredients, and instructions.
      2. If the image is not a recipe or is unreadable, return ONLY: {"error": "unreadable"}.
      3. Otherwise, return ONLY valid JSON in this format: 
        {"title": "string", "ingredients": ["string"], "instructions": ["string"]}
      4. Keep instructions concise to prevent JSON truncation.
    `;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
    // const gRespInitial = await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     contents: [{ parts: [{ text: prompt }, ...imageParts] }]
    //   })
    // })
    let gResp;
    
    try {
      // ATTEMPT 1: Inline Base64
      console.log("Calling Gemini API with inline data...");
      gResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...imageParts] }]
        })
      });
      
      if (!gResp.ok) throw new Error(`Gemini status: ${gResp.status}`);

    } catch (e) {
      // ATTEMPT 2: Fallback to Signed URLs
      console.log("Inline failed, retrying with Signed URLs...");
      
      const signedUrls = await Promise.all(
        imagePaths.map(async (path) => {
          const { data } = await supabase.storage.from('cookbooks').createSignedUrl(path, 60);
          return data.signedUrl;
        })
      );

      const retryParts = [
        { text: prompt },
        ...signedUrls.map((url: any) => ({
          // IMPORTANT: Tell Gemini it's a JPEG image URL
          inlineData: {
            data: "", 
            mimeType: "image/jpeg",
            // In late 2025/2026, Gemini API started accepting 'fileUri' or similar 
            // for signed URLs, but passing it as a text-part URL works as a prompt fallback
          },
          text: `Analyze this image: ${url}` 
        }))
      ];

      gResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: retryParts }],
        generationConfig: {
          maxOutputTokens: 2048, // Gives enough "paper" to finish the recipe
          temperature: 0,        // Forces factual accuracy (stops the guessing)
          responseMimeType: "application/json" // FORCES valid JSON structure
        } })
      });
    }
    // let gResp = gRespInitial
    // let gText = await gResp.text();

    // if (!gResp.ok) {
    //   console.error('Gemini non-OK response:', gResp.status, gResp.statusText, gText.slice(0, 1000));

    //   // If Gemini can't process inline images, retry by providing signed URLs instead
    //   if (gResp.status === 400 && gText.includes('Unable to process input image')) {
    //     console.log('Gemini failed to process inline images; attempting retry using signed URLs...');

    //     // Generate temporary signed URLs for each image
    //     const signedUrls = await Promise.all(
    //       imagePaths.map(async (path: string) => {
    //         try {
    //           const { data: signedData, error: signErr } = await supabase.storage.from('cookbooks').createSignedUrl(path, 60 * 60);
    //           if (signErr) {
    //             console.error('Signed URL creation error for', path, signErr);
    //             throw signErr;
    //           }
    //           console.log('Created signed URL for', path);
    //           return signedData.signedUrl;
    //         } catch (e) {
    //           console.error('Failed to create signed URL for', path, e);
    //           throw e;
    //         }
    //       })
    //     )

    //     // Build a new request body that includes the image URLs as plain text parts
    //     const urlPartsPayload = {
    //       contents: [{ parts: [{ text: prompt }, ...signedUrls.map((u: string) => ({ text: u }))] }]
    //     }

    //     console.log('Retrying Gemini call with URLs (preview):', JSON.stringify(urlPartsPayload).slice(0, 500));
    //     const retryResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify(urlPartsPayload)
    //     })

    //     const retryText = await retryResp.text();
    //     if (!retryResp.ok) {
    //       console.error('Gemini retry non-OK response:', retryResp.status, retryResp.statusText, retryText.slice(0, 1000));
    //       throw new Error(`Gemini API responded with ${retryResp.status} on retry`);
    //     }

    //     // Use the successful retry response
    //     gResp = retryResp;
    //     gText = retryText;
    //   } else {
    //     throw new Error(`Gemini API responded with ${gResp.status}`);
    //   }
    // }
    let gText = await gResp.text();
    let aiResult: any;
    try {
      aiResult = JSON.parse(gText)
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', e, gText.slice(0, 1000));
      throw new Error('Failed to parse Gemini response')
    }

    console.log("Gemini Response received");

    // Basic shape checks
    const rawText = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      console.error('Malformed Gemini response:', JSON.stringify(aiResult).slice(0, 2000));
      throw new Error('Gemini returned unexpected shape; check function logs for details')
    }

    console.log("Raw AI Text length:", rawText.length);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON object found in AI text (preview):', rawText.slice(0, 1000));
      throw new Error('AI did not return a valid JSON object. Check logs for Raw AI Text.')
    }

    const cleanJson = jsonMatch[0]

    let recipe: any
    try { 
      recipe = JSON.parse(cleanJson)
    } catch (e) {
      console.error('Failed to parse recipe JSON:', e, cleanJson.slice(0, 1000))
      throw new Error('Failed to parse recipe JSON from AI output')
    }

    // 3. Update the database row
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        title: recipe.title || "Untitled Recipe",
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        status: 'ready'
      })
      .eq('id', recipeId)

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError
    } else {
      console.log("Recipe updated successfully!");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    // Log full error server-side for debugging
    console.error('Function error:', error?.message || error, error?.stack || '')
    return new Response(JSON.stringify({ error: (error && error.message) ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})