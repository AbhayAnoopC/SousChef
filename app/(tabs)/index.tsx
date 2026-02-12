import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Play, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { scrapeRecipeFromUrl } from '../../lib/scraper';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const router = useRouter();
  const [importMode, setImportMode] = useState<'url' | 'photo' | null>(null);

  // 1. Delete Logic
  const deleteRecipe = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      Alert.alert("Error", "Could not delete recipe.");
    } else {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      onPress={() => deleteRecipe(id)}
      className="bg-red-500 justify-center items-center w-20 h-[92%] self-center rounded-r-3xl"
    >
      <Trash2 color="white" size={24} />
    </TouchableOpacity>
  );

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
      mediaTypes: ['images'],
      quality: 0.7, // Keeps file size small for faster upload
      base64: true, // Request base64 to ensure we have data
    });

    if (!result.canceled) {
      setLoading(true);
      const placeholderId = Crypto.randomUUID(); // Generate ID for path

      // 1. Upload to Storage (Edge function needs this)
      const imagePath = `${placeholderId}/page_0.jpg`;

      // INSERT PLACEHOLDER ROW so the Edge Function has something to update
      const { error: insertError } = await supabase.from('recipes').insert({
        id: placeholderId,
        title: "Scanning Cookbook...",
        status: 'processing',
        image_url: null, // We'll update this if needed, or the edge function can
        ingredients: [],
        instructions: []
      });

      if (insertError) {
        Alert.alert("Error", "Could not create recipe placeholder.");
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Could not process image data.");
        setLoading(false);
        return;
      }

      // Convert base64 to ArrayBuffer manually to avoid fetch/blob issues
      const binary = atob(asset.base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage.from('cookbooks').upload(imagePath, array.buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert("Upload Failed", uploadError.message);
        setLoading(false);
        return;
      }

      // 2. Trigger the Hybrid Function
      await supabase.functions.invoke('process-cookbook', {
        body: { recipeId: placeholderId, imagePaths: [imagePath] }
      });

      setLoading(false);
    }
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-surface">
      <ScrollView className="flex-1 pt-16 px-6">
        <Text className="text-accent/60 text-lg">Welcome back,</Text>
        <Text className="text-3xl font-bold text-accent mb-8">What's cooking?</Text>

        {/* Import Bento Card */}
        <TouchableOpacity
          onPress={() => {
            // A tiny delay ensures the gesture system finishes before the modal starts
            setTimeout(() => {
              setModalVisible(true);
            }, 1);
          }}
          className="w-full bg-primary p-8 rounded-[32px] mb-6 shadow-sm flex-row items-center justify-between"
        >
          <View>
            <Text className="text-white/80 font-medium">Have a link?</Text>
            <Text className="text-white text-2xl font-bold">Import Recipe</Text>
          </View>
          <Plus color="white" size={32} />
        </TouchableOpacity>

        <View className="space-y-4">
          {recipes.map((recipe) => (
            <Swipeable
              key={recipe.id}
              renderRightActions={() => renderRightActions(recipe.id)}
              containerStyle={{ overflow: 'visible' }} // Keeps rounded corners clean
            >
              <View className="bg-white p-6 rounded-[32px] flex-row items-center justify-between border border-gray-100">
                <View className="flex-1 mr-4">
                  <Text className="text-xl font-bold text-accent" numberOfLines={1}>
                    {recipe.title}
                  </Text>
                  <Text className="text-accent/60 mt-1">
                    {recipe.ingredients?.length || 0} ingredients
                  </Text>
                </View>

                {/* "Cook Now" Action */}
                <TouchableOpacity
                  onPress={() => {
                    if (recipe.status === 'processing') {
                      Alert.alert("Still Cooking!", "The AI is still reading this recipe.");
                      return;
                    }
                    router.push({
                      pathname: '/chef/[id]',
                      params: { id: recipe.id }
                    });
                  }}
                  className="bg-primary/10 px-5 py-3 rounded-2xl flex-row items-center space-x-2"
                >
                  <Text className="text-primary font-bold">Cook</Text>
                  <Play color="#10b981" size={16} fill="#10b981" />
                </TouchableOpacity>
              </View>
            </Swipeable>
          ))}
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* --- Import Modal Logic --- */}
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

            <TouchableOpacity onPress={() => { setModalVisible(false); setImportMode(null); }} className="mt-4">
              <Text className="text-center text-accent/40">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  recipeCard: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  recipeTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  recipeMeta: { fontSize: 14, color: '#777', marginTop: 4 },
  cookNowButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cookNowText: { color: 'white', fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
