// import { useRouter } from 'expo-router';
import { router } from 'expo-router';
import { ChefHat, Play } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';


export default function CookingTab() {
  console.log("Rendering CookingTab");
  const [activeSession, setActiveSession] = useState<any>(null);
  //const router = useRouter();

  useEffect(() => {
    // Find the most recently updated active session
    const getActiveSession = async () => {
      const { data } = await supabase
        .from('cooking_sessions')
        .select('*, recipes(title)')
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (data) setActiveSession(data);
    };
    getActiveSession();
  }, []);

  // useFocusEffect(
  //   useCallback(() => {
  //     const getActiveSession = async () => {
  //       const { data, error } = await supabase
  //         .from('cooking_sessions')
  //         .select('*, recipes(title)')
  //         .eq('is_active', true)
  //         .order('last_updated', { ascending: false })
  //         .limit(1)
  //         .maybeSingle(); // Use maybeSingle to avoid errors if empty

  //       if (data) {
  //         setActiveSession(data);
  //       } else {
  //         setActiveSession(null);
  //       }
  //     };

  //     getActiveSession();
  //   }, [])
  // );

  if (activeSession) {
    return (
      <View className="flex-1 bg-surface p-8 justify-center">
        <Text className="text-accent/60 text-lg">Continue Cooking</Text>
        <View className="bg-white p-8 rounded-[32px] mt-4 border border-gray-100 shadow-sm">
          <Text className="text-2xl font-bold text-accent mb-2">
            {activeSession.recipes?.title}
          </Text>
          <Text className="text-accent/60 mb-8">
            You were on Step {activeSession.current_step + 1}
          </Text>

          <TouchableOpacity
            onPress={() => router.push(`/chef/${activeSession.recipe_id}`)}
            className="bg-primary flex-row items-center justify-center p-5 rounded-2xl space-x-3"
          >
            <Play color="white" size={20} fill="white" />
            <Text className="text-white font-bold text-lg">Resume Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    return (


      <View className="items-center mb-10">
        <View className="bg-primary/10 p-6 rounded-full mb-6">
          <ChefHat size={60} color="#10b981" />
        </View>
        <Text className="text-3xl font-bold text-accent text-center">Ready to Cook?</Text>
        <Text className="text-accent/60 text-center mt-2 text-lg">
          Pick a recipe and I'll guide you step-by-step, hands-free.
        </Text>
      </View>


      // <View className="flex-1 bg-surface justify-center px-8">
      //   <View className="items-center mb-10">
      //     <View className="bg-primary/10 p-6 rounded-full mb-6">
      //       <ChefHat size={60} color="#10b981" />
      //     </View>
      //     <Text className="text-3xl font-bold text-accent text-center">Ready to Cook?</Text>
      //     <Text className="text-accent/60 text-center mt-2 text-lg">
      //       Pick a recipe and I'll guide you step-by-step, hands-free.
      //     </Text>
      //   </View>

      //   <View className="space-y-6 mb-12">
      //     <InstructionRow
      //       //icon={BookOpen}
      //       text="Select a recipe from your Library"
      //     />
      //     <InstructionRow
      //       //icon={Mic}
      //       text="Hold the button to ask questions or move steps"
      //     />
      //     <InstructionRow
      //       //icon={CheckCircle2}
      //       text="Focus on the food, let me handle the screen"
      //     />
      //   </View>

      //   <TouchableOpacity
      //     onPress={() => router.push('/')}
      //     className="bg-primary py-5 rounded-[24px] shadow-lg shadow-primary/30"
      //   >
      //     <Text className="text-white text-center text-xl font-bold">Go to My Recipes</Text>
      //   </TouchableOpacity>
      // </View>
    );
  }
}

// function InstructionRow({ icon: Icon, text }: { icon: any, text: string }) {
//   return (
//     <View className="flex-row items-center space-x-4">
//       <View className="bg-white p-3 rounded-2xl shadow-sm">
//         {/* Render the Icon component here directly */}
//         <Icon size={24} color="#10b981" />
//       </View>
//       <Text className="text-accent/80 text-base font-medium flex-1">{text}</Text>
//     </View>
//   );
// }
// Remove the 'icon' prop temporarily to see if it stops the crash.
// If it stops crashing, we know the Lucide icon was the culprit.
function InstructionRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center space-x-4 mb-4">
      <View className="bg-white p-3 rounded-2xl shadow-sm">
        <View className="w-6 h-6 bg-primary/20 rounded-full" />
      </View>
      <Text className="text-accent/80 text-base font-medium flex-1">{text}</Text>
    </View>
  );
}