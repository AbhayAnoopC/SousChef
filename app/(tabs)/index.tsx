import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Utensils, Refrigerator, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { extractRecipeData } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { scrapeRecipeFromUrl } from '../../lib/scraper';
import RecipeCard from '../../components/RecipeCard';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const router = useRouter();
  

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

  useEffect(() => {
    // 1. Initial Fetch
    const fetchRecipes = async () => {
    console.log("Fetching recipes..."); // Check if this runs
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Supabase Fetch Error:", error.message);
    }

    if (data) {
      console.log("Recipes found:", data.length); // Should say at least 1
      setRecipes(data);
    }
  };

    fetchRecipes();

    // 2. Realtime Listener (The "Superior" Way)
    const subscription = supabase
      .channel('public:recipes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recipes' }, (payload) => {
        setRecipes((current) => [payload.new, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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

          {/* The Recipe Grid */}
          {/* {recipes.map((recipe) => (
            <TouchableOpacity 
              key={recipe.id} 
              className="w-full"
              onPress={() => router.push("/test")}
              // onPress={() => {
              //   console.log("Navigating to recipe:", recipe.id);
              //   router.push({
              //     pathname: '/recipe/[id]',
              //     params: { id: recipe.id }
              //   });
              // }}
              
            >
              <RecipeCard 
                title={recipe.title} 
                image={recipe.image_url} 
                ingredientsCount={recipe.ingredients?.length || 0} 
              />
            </TouchableOpacity>          
          ))} */}

          {recipes.map((recipe) => (
            <TouchableOpacity 
              key={recipe.id} 
              activeOpacity={0.7} // This makes the card dim when pressed
              style={{ zIndex: 999, elevation: 5 }} // Forces it to the front
              onPress={() => {
                console.log("PRESSED:", recipe.id);
                Alert.alert("Touch Detected", "The button works!"); // Instant feedback
                router.push("/test");
              }}
            >
              <RecipeCard 
                title={recipe.title} 
                image={recipe.image_url} 
                ingredientsCount={recipe.ingredients?.length || 0} 
              />
            </TouchableOpacity>
          ))}
        </View>
        {/* Extra space at bottom for scrolling */}
        <View className="h-20" />
      </ScrollView>

      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white p-8 rounded-t-[40px] h-[40%] shadow-2xl">
            <Text className="text-2xl font-bold text-accent mb-4">Paste Recipe Link</Text>
            <TextInput 
              placeholder="Instagram, TikTok, or Blog URL"
              value={url}
              onChangeText={setUrl}
              className="bg-gray-100 p-5 rounded-2xl text-accent mb-6 text-lg"
              autoFocus
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity 
              onPress={handleImport}
              className="bg-primary p-5 rounded-2xl items-center shadow-md"
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-xl">Analyze Recipe</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setModalVisible(false)} 
              className="mt-6"
            >
              <Text className="text-center text-accent/40 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}