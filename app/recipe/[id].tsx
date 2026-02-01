import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Clock, Users } from 'lucide-react-native';

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

  if (!recipe) return <View className="flex-1 bg-surface" />;

  return (
    <ScrollView className="flex-1 bg-surface">
      {/* Header Image */}
      <View className="relative h-80 w-full bg-gray-200">
        {recipe.image_url && <Image source={{ uri: recipe.image_url }} className="w-full h-full" />}
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute top-12 left-6 bg-white/90 p-3 rounded-2xl shadow-sm"
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <View className="px-6 -mt-10 bg-surface rounded-t-[40px] pt-8 pb-20">
        <Text className="text-3xl font-bold text-accent mb-4">{recipe.title}</Text>
        
        {/* Quick Info Bento Row */}
        <View className="flex-row justify-between mb-8">
          <View className="bg-gray-50 p-4 rounded-3xl flex-1 mr-2 items-center border border-gray-100">
            <Clock size={20} color="#10b981" />
            <Text className="text-accent/60 mt-1">Prep</Text>
            <Text className="text-accent font-bold">20 min</Text>
          </View>
          <View className="bg-gray-50 p-4 rounded-3xl flex-1 ml-2 items-center border border-gray-100">
            <Users size={20} color="#10b981" />
            <Text className="text-accent/60 mt-1">Serves</Text>
            <Text className="text-accent font-bold">4</Text>
          </View>
        </View>

        {/* Ingredients List */}
        <Text className="text-xl font-bold text-accent mb-4">Ingredients</Text>
        {recipe.ingredients.map((item: string, index: number) => (
          <View key={index} className="flex-row items-center mb-3 bg-white p-4 rounded-2xl border border-gray-50">
            <View className="w-2 h-2 bg-primary rounded-full mr-4" />
            <Text className="text-accent/80 text-lg flex-1">{item}</Text>
          </View>
        ))}

        {/* Instructions List */}
        <Text className="text-xl font-bold text-accent mt-8 mb-4">Instructions</Text>
        {recipe.instructions.map((step: string, index: number) => (
          <View key={index} className="mb-6">
            <Text className="text-primary font-bold text-lg mb-2">Step {index + 1}</Text>
            <Text className="text-accent/70 text-lg leading-7">{step}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}