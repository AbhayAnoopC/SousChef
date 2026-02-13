import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ChefHat, Play, RotateCcw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';


export default function CookingTab() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);


    // Active session (safe if none)
    const { data: active } = await supabase
      .from('cooking_sessions')
      .select('recipe_id, current_step, last_updated, recipes(title)')
      .eq('is_active', true)
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();

    setActiveSession(active ?? null);

    // History (most recent finished sessions)
    const { data: history } = await supabase
      .from('cooking_sessions')
      .select('recipe_id, current_step, last_updated, recipes(title)')
      .eq('is_active', false)
      .order('last_updated', { ascending: false })
      .limit(5);

    setHistorySessions(history ?? []);
    setLoading(false);
  };


  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );




  const handleCookAgain = async (recipeId: string) => {
    // Reset + mark active so it becomes a real new session
    const { error } = await supabase
      .from('cooking_sessions')
      .upsert(
        {
          recipe_id: recipeId,
          current_step: 0,
          chat_history: [],
          is_active: true,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'recipe_id' }
      );

    if (error) {
      console.error('Cook again error:', error);
      // Still try navigating so user isn't blocked
    }

    router.push(`/chef/${recipeId}`);
  };

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-accent">Sous Chef</Text>
          <Text className="text-accent/60 mt-1 text-base">
            Hands-free guidance while you cook.
          </Text>
        </View>

        {/* Active Session */}
        {activeSession ? (
          <View className="mb-8">
            <Text className="text-accent/60 text-sm font-bold uppercase tracking-widest mb-3">
              Continue cooking
            </Text>

            <View className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
              <Text className="text-xl font-bold text-accent mb-1">
                {activeSession.recipes?.title ?? 'Untitled recipe'}
              </Text>
              <Text className="text-accent/60 mb-5">
                You were on Step {Number(activeSession.current_step ?? 0) + 1}
              </Text>

              <TouchableOpacity
                onPress={() => router.push(`/chef/${activeSession.recipe_id}`)}
                className="bg-primary flex-row items-center justify-center p-4 rounded-2xl"
              >
                <Play color="white" size={18} fill="white" />
                <Text className="text-white font-bold text-base ml-2">Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm mb-8">
            <View className="flex-row items-center">
              <View className="bg-primary/10 p-4 rounded-full mr-4">
                <ChefHat size={28} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-accent">Ready to cook?</Text>
                <Text className="text-accent/60 mt-1">
                  Pick a recipe from your Library and tap Cook Now.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* How it works */}
        <View className="mb-8">
          <Text className="text-accent/60 text-sm font-bold uppercase tracking-widest mb-3">
            How to use it
          </Text>

          <View className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
            <InstructionRow text="Open a recipe and tap Cook Now" />
            <InstructionRow text="Hold the mic to ask questions or move steps" />
            <InstructionRow text="Tap View Chat to read responses (or mute voice)" />

            <View className="mt-5">
              <Text className="text-accent/60 text-xs font-bold uppercase tracking-widest mb-3">
                Try saying
              </Text>
              <View className="flex-row flex-wrap">
                <ExampleChip text="Next step" />
                <ExampleChip text="Repeat that" />
                <ExampleChip text="I don’t have yogurt—substitute?" />
                <ExampleChip text="How do I know it’s done?" />
              </View>
            </View>
          </View>
        </View>

        {/* History */}
        <View>
          <Text className="text-accent/60 text-sm font-bold uppercase tracking-widest mb-3">
            History
          </Text>

          {loading ? (
            <Text className="text-accent/50">Loading…</Text>
          ) : historySessions.length === 0 ? (
            <Text className="text-accent/50">No finished sessions yet.</Text>
          ) : (
            <View className="space-y-3">
              {historySessions.map((s) => (
                <View
                  key={s.recipe_id}
                  className="bg-white px-5 py-4 rounded-[22px] border border-gray-100 shadow-sm flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-accent font-bold text-base" numberOfLines={1}>
                      {s.recipes?.title ?? 'Untitled recipe'}
                    </Text>
                    <Text className="text-accent/50 mt-1 text-sm">
                      Last step: {Number(s.current_step ?? 0) + 1}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleCookAgain(s.recipe_id)}
                    className="bg-slate-100 px-4 py-3 rounded-2xl flex-row items-center"
                  >
                    <RotateCcw size={16} color="#64748B" />
                    <Text className="text-slate-700 font-bold ml-2 text-sm">Cook again</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InstructionRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="bg-primary/10 w-9 h-9 rounded-2xl items-center justify-center mr-4">
        <View className="w-2.5 h-2.5 bg-primary rounded-full" />
      </View>
      <Text className="text-accent/80 text-base font-medium flex-1">{text}</Text>
    </View>
  );
}

function ExampleChip({ text }: { text: string }) {
  return (
    <View className="bg-slate-100 px-4 py-2 rounded-full mr-2 mb-2 border border-slate-200">
      <Text className="text-slate-700 font-semibold text-sm">“{text}”</Text>
    </View>
  );
}
