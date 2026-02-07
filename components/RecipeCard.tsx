import { View, Text, Image, TouchableOpacity, GestureResponderEvent } from 'react-native';

interface RecipeCardProps {
  title: string;
  image?: string;
  ingredientsCount: number;
  onPress?: (event?: GestureResponderEvent) => void;
}

// export default function RecipeCard({ title, image, ingredientsCount, onPress }: RecipeCardProps) {
//   return (
//     <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="bg-white rounded-[32px] overflow-hidden mb-4 border border-gray-100 shadow-sm">
//       {image && (
//         <Image source={{ uri: image }} className="w-full h-40 bg-gray-200" resizeMode="cover" />
//       )}
//       <View className="p-6">
//         <Text className="text-xl font-bold text-accent mb-2" numberOfLines={2}>{title}</Text>
//         <Text className="text-accent/50 font-semibold">{ingredientsCount} Ingredients</Text>
//       </View>
//     </TouchableOpacity>
//   );
// }


export default function RecipeCard({ title, image, ingredientsCount, status, onPress }: any) {
  const isProcessing = status === 'processing';

  return (
    <TouchableOpacity 
      onPress={isProcessing ? undefined : onPress} 
      className={`bg-white rounded-[32px] overflow-hidden mb-4 border border-gray-100 ${isProcessing ? 'opacity-60' : ''}`}
    >
        {image && (
        <Image source={{ uri: image }} className="w-full h-40 bg-gray-200" resizeMode="cover" />
        )}
      <View className="p-6">
        <Text className="text-xl font-bold text-accent mb-2">
          {isProcessing ? "👨‍🍳 Reading Cookbook..." : title}
        </Text>
        <Text className="text-accent/50 font-semibold">
          {isProcessing ? "Merging pages..." : `${ingredientsCount} Ingredients`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}