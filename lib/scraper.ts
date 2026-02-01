import { parse } from 'node-html-parser';

export interface ScrapedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  image?: string;
}

export const scrapeRecipeFromUrl = async (url: string): Promise<ScrapedRecipe> => {
  try {
    const response = await fetch(url, {
        headers: {
        // This tells the website you are a real Chrome browser on a Mac
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    const html = await response.text();
    console.log("HTML Preview:", html.substring(0, 500));
    const root = parse(html);

    // Find all JSON-LD scripts
    const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
    
    let recipeData: any = null;

    for (const script of jsonLdScripts) {
      const json = JSON.parse(script.innerText);
      
      // JSON-LD can be a single object, an array, or a @graph
      const dataArray = Array.isArray(json) ? json : (json['@graph'] || [json]);
      
      recipeData = dataArray.find((item: any) => item['@type'] === 'Recipe' || 
          (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
      if (recipeData) break;
    }

    if (!recipeData) {
      throw new Error("No structured recipe data found on this page.");
    }

    // Process Instructions (they can be strings or HowToStep objects)
    const instructions = Array.isArray(recipeData.recipeInstructions)
      ? recipeData.recipeInstructions.map((step: any) => 
          typeof step === 'string' ? step : step.text || step.name
        )
      : [recipeData.recipeInstructions];

    return {
      title: recipeData.name,
      ingredients: recipeData.recipeIngredient || [],
      instructions: instructions.filter(Boolean),
      image: Array.isArray(recipeData.image) ? recipeData.image[0] : recipeData.image?.url || recipeData.image,
    };
  } catch (error) {
    console.error("Scraper Error:", error);
    throw new Error("Failed to extract recipe. The site might not support standard sharing.");
  }
};