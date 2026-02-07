import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Utensils, Refrigerator, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { extractRecipeData } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { scrapeRecipeFromUrl } from '../../lib/scraper';
import RecipeCard from '../../components/RecipeCard';
import * as ImagePicker from 'expo-image-picker';
import { processCookbookPhotos } from '../../lib/gemini'; // We'll update gemini.ts next

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const router = useRouter();
  const [importMode, setImportMode] = useState<'url' | 'photo' | null>(null);


useEffect(() => {
  // 1. Initial Load of recipes
  fetchRecipes();

  // 2. Realtime Listener for the "Flip"
  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recipes' },
      (payload) => {
        console.log('Change received!', payload);
        
        if (payload.eventType === 'INSERT') {
          // Add the "Processing" card to the top of the list
          setRecipes((current) => [payload.new, ...current]);
        } else if (payload.eventType === 'UPDATE') {
          // Update the existing card (flips from "Processing" to the real title)
          setRecipes((current) =>
            current.map((r) => (r.id === payload.new.id ? payload.new : r))
          );
        } else if (payload.eventType === 'DELETE') {
          setRecipes((current) => current.filter((r) => r.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

const fetchRecipes = async () => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) setRecipes(data);
};



  const handleImport = async () => {
    setLoading(true);
    try {
      // 1. Try Structured Data Scraper First (Fast & Free)
      const recipe = await scrapeRecipeFromUrl(url);

      // 2. Save to Supabase
      const { error } = await supabase.from('recipes').insert([
        { 
          title: recipe.title, 
          ingredients: recipe.ingredients, 
          instructions: recipe.instructions,
          image_url: recipe.image,
          source_url: url 
        }
      ]);

      if (error) throw error;
      Alert.alert("Success!", `${recipe.title} added.`);
      setModalVisible(false);
    } catch (err) {
      // 3. Fallback: If scraper fails, we COULD trigger Gemini here
      Alert.alert("Import Failed", "This site doesn't share data easily. Try a different link.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoImport = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    selectionLimit: 4,
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,  });

  if (!result.canceled) {
    setLoading(true);
    let placeholderId = null;

    try {
      // 1. Create Placeholder Row
      const { data: placeholder, error: pError } = await supabase
        .from('recipes')
        .insert([{ 
          title: "Chef is reading cookbook...", 
          status: "processing",
          ingredients: [], 
          instructions: [] 
        }])
        .select()
        .single();

      if (pError) throw pError;
      placeholderId = placeholder.id;

      // 2. Upload Images to Supabase Storage
      const imagePaths: string[] = [];
      
      for (const [index, asset] of result.assets.entries()) {
        const fileExt = asset.uri.split('.').pop();
        const path = `${placeholderId}/page_${index}.jpg`;
        
        // Convert URI to Blob for upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('cookbooks')
          .upload(path, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;
        imagePaths.push(path);
      }

      // 3. Trigger the Edge Function (The "Brain")
      const { data, error: funcError } = await supabase.functions.invoke('process-cookbook', {
        body: { recipeId: placeholderId, imagePaths: imagePaths },  
        headers: {
          "Authorization": `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}` 
        }
      });

      if (funcError) throw funcError;

      Alert.alert("Sent to Chef", "Processing started! You can close this; it will update automatically.");

    } catch (err: any) {
      console.error(err);
      // Cleanup placeholder if it fails before the function starts
      if (placeholderId) await supabase.from('recipes').delete().eq('id', placeholderId);
      Alert.alert("Import Failed", err.message || "Could not connect to server.");
    } finally {
      setLoading(false);
      setModalVisible(false);
    }
  }
};

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1 pt-16 px-6">
        <Text className="text-accent/60 text-lg">Welcome back,</Text>
        <Text className="text-3xl font-bold text-accent mb-8">What's cooking?</Text>

        <View className="flex-row flex-wrap justify-between">
          {/* Import Bento Card */}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            className="w-full bg-primary p-8 rounded-[32px] mb-6 shadow-sm flex-row items-center justify-between"
          >
            <View>
              <Text className="text-white/80 font-medium">Have a link?</Text>
              <Text className="text-white text-2xl font-bold">Import Recipe</Text>
            </View>
            <Plus color="white" size={32} />
          </TouchableOpacity>


          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              title={recipe.title}
              image={recipe.image_url}
              ingredientsCount={recipe.ingredients?.length || 0}
              status={recipe.status}
              onPress={() => {
                if (recipe.status === 'processing') {
                  Alert.alert("Still Cooking!", "The AI is still reading this recipe. Give it a few more seconds.");
                  return;
                }
                console.log("Navigating to:", recipe.id);
                router.push(`/recipe/${recipe.id}`);
              }}
            />
          ))}
        </View>
        {/* Extra space at bottom for scrolling */}
        <View className="h-20" />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
  <View className="flex-1 justify-end bg-black/50">
    <View className="bg-white p-8 rounded-t-[40px] min-h-[50%]">
      <Text className="text-2xl font-bold text-accent mb-6 text-center">Import Method</Text>
      
      <View className="flex-row justify-between mb-8">
        {/* URL Option */}
        <TouchableOpacity 
          className="bg-gray-50 p-6 rounded-[32px] w-[48%] items-center border border-gray-100"
          onPress={() => setImportMode('url')}
        >
          <View className="bg-primary/10 p-4 rounded-full mb-3">
            <Plus color="#10b981" size={24} />
          </View>
          <Text className="font-bold text-accent">Paste Link</Text>
        </TouchableOpacity>

        {/* Photo Option */}
        <TouchableOpacity 
          className="bg-gray-50 p-6 rounded-[32px] w-[48%] items-center border border-gray-100"
          onPress={handlePhotoImport}
        >
          <View className="bg-primary/10 p-4 rounded-full mb-3">
            <Plus color="#10b981" size={24} />
          </View>
          <Text className="font-bold text-accent">Cookbook Photo</Text>
        </TouchableOpacity>
      </View>

      {importMode === 'url' && (
        <View>
          <TextInput 
            placeholder="Paste recipe URL..."
            value={url}
            onChangeText={setUrl}
            className="bg-gray-100 p-5 rounded-2xl mb-4"
          />
          <TouchableOpacity onPress={handleImport} className="bg-primary p-5 rounded-2xl">
            <Text className="text-white text-center font-bold">Process Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={() => {setModalVisible(false); setImportMode(null);}} className="mt-4">
        <Text className="text-center text-accent/40">Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
}