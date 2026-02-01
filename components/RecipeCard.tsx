import { View, Text, Image, TouchableOpacity } from 'react-native';

interface RecipeCardProps {
  title: string;
  image?: string;
  ingredientsCount: number;
}

export default function RecipeCard({ title, image, ingredientsCount }: RecipeCardProps) {
  return (
    <TouchableOpacity className="bg-white rounded-[32px] overflow-hidden mb-4 border border-gray-100 shadow-sm">
      {image && (
        <Image source={{ uri: image }} className="w-full h-40 bg-gray-200" resizeMode="cover" />
      )}
      {/* CHANGE THIS FROM <div> TO <View> */}
      <View className="p-6">
        <Text className="text-xl font-bold text-accent mb-2" numberOfLines={2}>{title}</Text>
        <Text className="text-accent/50 font-semibold">{ingredientsCount} Ingredients</Text>
      </View>
    </TouchableOpacity>
  );
}