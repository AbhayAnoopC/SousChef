import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, ChefHat, ChevronLeft, Clock, Play, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<any>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      const { data } = await supabase.from('recipes').select('*').eq('id', id).single();
      if (data) setRecipe(data);
    };
    fetchRecipe();
  }, [id]);

  if (!recipe) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-slate-400 font-medium">Preparing your kitchen...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <StatusBar barStyle="light-content" />

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-12 left-6 z-50 bg-white/90 p-3 rounded-2xl shadow-lg shadow-black/20 border border-white"
        style={{ elevation: 10 }} // Ensures it stays above the image on Android
      >
        <ChevronLeft size={24} color="#0F172A" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1 pt-24" // Offset for the fixed header
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >


        <View className="px-6 mb-8">
          <View className="h-72 w-full rounded-[40px] overflow-hidden bg-slate-100 shadow-sm">
            {recipe.image_url ? (
              <Image source={{ uri: recipe.image_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <ChefHat size={64} color="#E2E8F0" />
              </View>
            )}
          </View>
        </View>

        <View className="px-6 pt-10 pb-32">

          {/* Recipe Title & Meta */}
          <View className="mb-8">
            <Text className="text-4xl font-extrabold text-slate-900 leading-tight mb-4">
              {recipe.title}
            </Text>

            <View className="flex-row space-x-3">
              <View className="bg-slate-900 px-4 py-2 rounded-full flex-row items-center">
                <Clock size={14} color="white" />
                <Text className="text-white text-xs font-bold ml-2">25 MINS</Text>
              </View>
              <View className="bg-gray-100 px-4 py-2 rounded-full flex-row items-center">
                <Users size={14} color="#64748B" />
                <Text className="text-slate-500 text-xs font-bold ml-2">4 SERVINGS</Text>
              </View>
            </View>
          </View>

          {/* 3. Ingredients Bento Card */}
          <View className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-6">
            <View className="flex-row items-center mb-6">
              <View className="bg-primary/10 p-2 rounded-xl mr-3">
                <BookOpen size={20} color="#10b981" />
              </View>
              <Text className="text-xl font-bold text-slate-900">Ingredients</Text>
            </View>

            <View className="space-y-3">
              {recipe.ingredients.map((item: string, index: number) => (
                <View key={index} className="flex-row items-start py-2 border-b border-gray-50 last:border-0">
                  <View className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-4" />
                  <Text className="text-slate-600 text-lg flex-1 leading-6">{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Instructions Bento Card */}
          <View className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-6">
              <View className="bg-primary/10 p-2 rounded-xl mr-3">
                <Play size={20} color="#10b981" fill="#10b981" />
              </View>
              <Text className="text-xl font-bold text-slate-900">Instructions</Text>
            </View>

            {recipe.instructions.map((step: string, index: number) => (
              <View key={index} className="mb-8 last:mb-0">
                <View className="flex-row items-center mb-3">
                  <View className="bg-slate-900 w-8 h-8 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">{index + 1}</Text>
                  </View>
                  <View className="h-[1px] flex-1 bg-gray-100" />
                </View>
                <Text className="text-slate-600 text-lg leading-7 px-1">
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 5. Fixed "Cook Now" Action Bar */}
      <View className="absolute bottom-0 w-full p-8 bg-white/80 border-t border-gray-100">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/chef/${recipe.id}`);
          }}
          className="bg-primary py-5 rounded-[24px] flex-row items-center justify-center shadow-xl shadow-primary/30"
        >
          <Play color="white" size={20} fill="white" />
          <Text className="text-white text-xl font-bold ml-2">Start Cooking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}