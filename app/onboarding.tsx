// import { router } from 'expo-router';
// import { useState } from 'react';
// import { Text, TouchableOpacity, View } from 'react-native';
// import { supabase } from '../lib/supabase';

// export default function Onboarding() {
//     const [loading, setLoading] = useState(false);

//     const finish = async () => {
//         setLoading(true);
//         const { data: { session } } = await supabase.auth.getSession();

//         if (session?.user?.id) {
//             await supabase
//                 .from('profiles')
//                 .update({ has_onboarded: true })
//                 .eq('id', session.user.id);
//         }

//         setLoading(false);
//         router.replace('/(tabs)');
//     };

//     return (
//         <View className="flex-1 bg-surface px-8 pt-20">
//             {/* Replace this with your Apple-style slides next */}
//             <Text className="text-4xl font-black text-slate-900">Welcome to Sous Chef</Text>
//             <Text className="text-slate-500 mt-3 text-lg">
//                 Save recipes fast and cook hands-free, step-by-step.
//             </Text>

//             <View className="flex-1" />

//             <TouchableOpacity
//                 disabled={loading}
//                 onPress={finish}
//                 className="bg-primary py-5 rounded-[24px] mb-10"
//             >
//                 <Text className="text-white text-center text-xl font-bold">
//                     {loading ? 'Setting up…' : 'Get Started'}
//                 </Text>
//             </TouchableOpacity>
//         </View>
//     );
// }
import { useRouter } from 'expo-router';
import { Check, Mic } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'See a recipe you love?',
        sub: 'Import it instantly from Instagram, TikTok, or cookbooks.',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop',
        color: '#10b981'
    },
    {
        id: '2',
        title: 'Cook hands-free.',
        sub: 'Ask for substitutions. Move steps. Get guidance in real time.',
        icon: <Mic size={80} color="white" />,
        color: '#0F172A'
    },
    {
        id: '3',
        title: 'Never lose a recipe again.',
        sub: 'Save, organize, and cook smarter.',
        image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=1000&auto=format&fit=crop',
        color: '#10b981'
    }
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSurvey, setShowSurvey] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            // If a user somehow lands here without being logged in, kick them to login
            if (!user) {
                router.replace('/');
            }
        };
        checkUser();
    }, []);
    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Instead of showing a survey, we go straight to the app
            completeAndExit();
        }
    };
    const completeAndExit = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // We still update the DB so the app knows they've seen the slides
                await supabase.from('profiles').upsert({
                    id: user.id,
                    has_onboarded: true
                });
            }

            // Use a small timeout to prevent the "Navigation Context" crash
            // this gives the final slide a moment to settle
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 100);

        } catch (error) {
            console.error("Exit error:", error);
            router.replace('/(tabs)');
        }
    };


    if (showSurvey) {
        return (
            <View className="flex-1 bg-white px-8 pt-24">
                <Text className="text-4xl font-black text-slate-900 mb-2">One last thing...</Text>
                <Text className="text-slate-400 text-lg mb-10">What kind of cooking do you do most?</Text>

                <View className="space-y-4">
                    {['Quick weekday meals', 'Healthy cooking', 'Baking', 'Exploring cuisines'].map((item) => (
                        <TouchableOpacity
                            key={item}
                            onPress={() => setSelectedStyle(item)}
                            className={`p-6 rounded-[28px] border-2 flex-row justify-between items-center ${selectedStyle === item ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'}`}
                        >
                            <Text className={`text-lg font-bold ${selectedStyle === item ? 'text-primary' : 'text-slate-600'}`}>{item}</Text>
                            {selectedStyle === item && <Check size={20} color="#10b981" />}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={completeAndExit}
                    disabled={!selectedStyle}
                    className={`absolute bottom-12 left-8 right-8 py-6 rounded-[32px] items-center ${selectedStyle ? 'bg-slate-900 shadow-xl shadow-slate-900/30' : 'bg-slate-200'}`}
                >
                    <Text className="text-white text-xl font-bold">Get Started</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => (
                    <View style={{ width, height }} className="items-center justify-center px-10">
                        <View className="w-full h-80 rounded-[48px] overflow-hidden mb-12 shadow-2xl">
                            {item.id === '2' ? (
                                <View style={{ backgroundColor: item.color }} className="flex-1 items-center justify-center">
                                    {item.icon}
                                </View>
                            ) : (
                                <Image source={{ uri: item.image }} className="flex-1" />
                            )}
                        </View>
                        <Text className="text-4xl font-black text-slate-900 text-center mb-4 leading-tight">{item.title}</Text>
                        <Text className="text-slate-400 text-lg text-center leading-7">{item.sub}</Text>
                    </View>
                )}
            />

            {/* Pagination Dots */}
            <View className="flex-row absolute top-24 self-center space-x-2">
                {SLIDES.map((_, i) => (
                    <View key={i} className={`padding-4 h-2 rounded-full ${currentIndex === i ? 'w-8 bg-primary' : 'w-2 bg-slate-200'}`} />
                ))}
            </View>

            <View className="absolute bottom-12 w-full px-10">
                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.8}
                    className="bg-emerald-500 py-6 rounded-[32px] items-center justify-center shadow-xl shadow-emerald-200"
                >
                    <Text className="text-white text-xl font-black tracking-tight">
                        {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}