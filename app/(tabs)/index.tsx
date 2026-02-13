import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChefHat, Link, Play, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getIsPro } from "../../lib/revenuecat";
import { scrapeRecipeFromUrl } from '../../lib/scraper';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'url' | 'photo' | null>(null);
  const router = useRouter();

  const requireProIfRecipeLimitHit = async () => {
    const isPro = await getIsPro();
    if (isPro) return true;

    // Count recipes in current month (simple approach)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    if (error) {
      // fail open so you don't block demo due to a count glitch
      return true;
    }

    // if ((count ?? 0) >= 10) {
    if ((count ?? 0) >= 10) {

      router.push("/paywall");
      return false;
    }

    return true;
  };

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('has_onboarded')
          .eq('id', user.id)
          .maybeSingle();

        // If no profile exists OR has_onboarded is false, send them to onboarding
        if (!data || data.has_onboarded === false) {
          // We use push so they can't see the library "blink" behind it
          router.push('/onboarding');
        }
      }
    };

    checkOnboarding();
  }, []);



  useEffect(() => {
    fetchRecipes();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, (payload) => {
        if (payload.eventType === 'INSERT') setRecipes((current) => [payload.new, ...current]);
        else if (payload.eventType === 'UPDATE') setRecipes((current) => current.map((r) => (r.id === payload.new.id ? payload.new : r)));
        else if (payload.eventType === 'DELETE') setRecipes((current) => current.filter((r) => r.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // const fetchRecipes = async () => {
  //   const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
  //   if (!error && data) setRecipes(data);
  // };
  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id) // THIS IS THE KEY LINE
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching personal recipes:", error);
    } else {
      setRecipes(data);
    }
  };

  const deleteRecipe = (id: string, title: string) => {
    Alert.alert("Delete Recipe", `Remove "${title}" from your library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from('recipes').delete().eq('id', id);
        }
      }
    ]);
  };
  const handleImport = async () => {

    if (!url) return;

    const allowed = await requireProIfRecipeLimitHit();
    if (!allowed) return;

    setLoading(true);
    try {
      const recipe = await scrapeRecipeFromUrl(url);
      const { error } = await supabase.from('recipes').insert([{
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        image_url: recipe.image,
        source_url: url
      }]);
      if (error) throw error;
      setModalVisible(false);
      setUrl('');
      setImportMode(null);
    } catch (err) {
      Alert.alert("Import Failed", "Try a different link or use the Cookbook Photo option.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoImport = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    const allowed = await requireProIfRecipeLimitHit();
    if (!allowed) return;

    if (!result.canceled) {
      setLoading(true);
      setModalVisible(false);
      const placeholderId = Crypto.randomUUID();
      const imagePath = `${placeholderId}/page_0.jpg`;

      const { error: insertError } = await supabase.from('recipes').insert({
        id: placeholderId,
        title: "Scanning Cookbook...",
        status: 'processing',
        ingredients: [],
        instructions: []
      });

      if (insertError) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      const binary = atob(asset.base64!);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);

      const { error: uploadError } = await supabase.storage.from('cookbooks').upload(imagePath, array.buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (!uploadError) {
        await supabase.functions.invoke('process-cookbook', {
          body: { recipeId: placeholderId, imagePaths: [imagePath] }
        });
      }
      setLoading(false);
    }
  };


  const renderRecipeCard = ({ item }: { item: any }) => {
    const isProcessing = item.status === 'processing';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => deleteRecipe(item.id, item.title)}
        onPress={() => (isProcessing ? null : router.push(`/recipe/${item.id}`))}
        className="flex-1 m-2 bg-white rounded-[28px] overflow-hidden shadow-sm border border-gray-100"
        style={{ aspectRatio: 0.75 }}
      >
        {/* Top: Image Section (No more text overlay) */}
        <View className="flex-1 bg-gray-50">
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              {isProcessing ? (
                <ActivityIndicator color="#10b981" />
              ) : (
                <ChefHat size={32} color="#D1D5DB" />
              )}
            </View>
          )}
        </View>

        {/* Bottom: Title & Play Button Row */}
        <View className="px-4 py-4 bg-white flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <Text
              className="text-slate-900 font-bold text-base leading-5"
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => (isProcessing ? null : router.push(`/chef/${item.id}`))}
            className="bg-primary/10 p-2.5 rounded-full"
          >
            <Play size={16} color="#10b981" fill="#10b981" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: 100 }}
        ListHeaderComponent={
          <View className="mb-8 px-2">
            <Text className="text-gray-400 text-lg font-medium">Welcome back,</Text>
            <Text className="text-4xl font-bold text-slate-900">Library</Text>

            <TouchableOpacity
              onPress={async () => {
                const allowed = await requireProIfRecipeLimitHit();
                if (!allowed) return;
                setTimeout(() => setModalVisible(true), 1);
              }}
              className="mt-8 w-full bg-slate-900 p-8 rounded-[32px] shadow-xl shadow-slate-900/20"
            >
              <View>
                <Text className="text-white/60 font-medium">Expand your collection</Text>
                <Text className="text-white text-2xl font-bold">Import Recipe</Text>
              </View>
              <View className="bg-white/20 p-4 rounded-full">
                <Plus color="white" size={28} />
              </View>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderRecipeCard}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/60">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
          >
            <View className="bg-white p-8 rounded-t-[48px] shadow-2xl">
              <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-8" />
              <Text className="text-2xl font-bold text-slate-900 mb-8 text-center">How would you like to import?</Text>

              <View className="flex-row justify-between mb-8">
                {/* URL Option */}
                <TouchableOpacity
                  className={`p-6 rounded-[32px] w-[48%] items-center border ${importMode === 'url' ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-100'}`}
                  onPress={() => setImportMode('url')}
                >
                  <Link color={importMode === 'url' ? "#10b981" : "#64748b"} size={28} />
                  <Text className={`font-bold mt-3 ${importMode === 'url' ? 'text-primary' : 'text-slate-600'}`}>Website Link</Text>
                </TouchableOpacity>

                {/* Photo Option */}
                <TouchableOpacity
                  className="bg-gray-50 p-6 rounded-[32px] w-[48%] items-center border border-gray-100"
                  onPress={handlePhotoImport}
                >
                  <Camera color="#64748b" size={28} />
                  <Text className="font-bold text-slate-600 mt-3">Book Photo</Text>
                </TouchableOpacity>
              </View>

              {importMode === 'url' && (
                <View>
                  <TextInput
                    placeholder="Paste recipe link here..." // Added placeholder
                    placeholderTextColor="#94a3b8"
                    value={url}
                    onChangeText={setUrl}
                    autoFocus
                    className="bg-gray-100 p-6 rounded-3xl mb-4 text-slate-900 border border-gray-200"
                  />
                  <TouchableOpacity
                    onPress={handleImport}
                    disabled={loading}
                    className="bg-primary p-6 rounded-3xl shadow-lg shadow-primary/30"
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white text-center font-bold text-lg">Process Link</Text>}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={() => { setModalVisible(false); setImportMode(null); }}
                className="mt-6 py-2"
              >
                <Text className="text-center text-slate-400 font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

