import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { List, MessageCircle, Mic, Volume2, VolumeX, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ChefScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [recipe, setRecipe] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showIngredients, setShowIngredients] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
    const chatSyncTimeout = useRef<any>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scrollRef = useRef<ScrollView>(null);
    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        });
    };
    useEffect(() => {
        if (showChat) {
            scrollToBottom();
        }
    }, [showChat]);

    useEffect(() => {
        if (showChat && messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, showChat]);


    const isMutedRef = useRef(isMuted);
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);


    // 1. Load Data & Persistent Session
    useEffect(() => {
        const loadData = async () => {
            const { data: rec } = await supabase.from('recipes').select('*').eq('id', id).single();
            if (rec) setRecipe(rec);

            const { data: ses } = await supabase.from('cooking_sessions')
                .select('current_step, chat_history')
                .eq('recipe_id', id)
                .maybeSingle();

            if (ses) {
                setCurrentStep(ses.current_step || 0);
                setMessages(ses.chat_history || []);
            }
        };
        loadData();
    }, [id]);

    // useEffect(() => {
    //     if (!recipe) return;

    //     supabase
    //         .from('cooking_sessions')
    //         .upsert(
    //             {
    //                 recipe_id: id,
    //                 is_active: true,
    //                 last_updated: new Date().toISOString(),
    //             },
    //             { onConflict: 'recipe_id' }
    //         )
    //         .then(({ error }) => {
    //             if (error) console.error('activate session error:', error);
    //         });
    // }, [recipe, id]);

    // 2. Sync Progress & Chat History to Supabase
    // useEffect(() => {
    //     if (recipe) {
    //         supabase.from('cooking_sessions').upsert({
    //             recipe_id: id,
    //             current_step: currentStep,
    //             chat_history: messages, // Now saving chat
    //             last_updated: new Date().toISOString(),
    //             is_active: true
    //         }, { onConflict: 'recipe_id' }).then();
    //     }
    // }, [currentStep, messages]);
    useEffect(() => {
        if (!recipe) return;

        supabase
            .from('cooking_sessions')
            .upsert({
                recipe_id: id,
                current_step: currentStep,
                last_updated: new Date().toISOString(),
                is_active: true
            }, { onConflict: 'recipe_id' })
            .then(({ error }) => {
                if (error) console.error("step sync error:", error);
            });
    }, [currentStep, recipe, id]);

    useEffect(() => {
        if (recording || isProcessing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [recording, isProcessing, pulseAnim]);


    useEffect(() => {
        if (!recipe) return;

        if (chatSyncTimeout.current) {
            clearTimeout(chatSyncTimeout.current);
        }

        chatSyncTimeout.current = setTimeout(() => {
            supabase
                .from('cooking_sessions')
                .upsert({
                    recipe_id: id,
                    chat_history: messages,
                    last_updated: new Date().toISOString(),
                    is_active: true
                }, { onConflict: 'recipe_id' })
                .then(({ error }) => {
                    if (error) console.error("chat sync error:", error);
                });
        }, 800);

        return () => {
            if (chatSyncTimeout.current) clearTimeout(chatSyncTimeout.current);
        };
    }, [messages, recipe, id]);

    useEffect(() => {
        if (isMuted) {
            Speech.stop();
        }
    }, [isMuted]);

    useEffect(() => {
        (async () => {
            try {
                const voices = await Speech.getAvailableVoicesAsync();
                const english = voices.filter(v => v.language?.startsWith('en'));

                const enhanced =
                    english.find(v => (v as any).quality === 'Enhanced') ||
                    english.find(v => v.identifier?.toLowerCase().includes('siri')) ||
                    english[0];

                if (enhanced?.identifier) setSelectedVoice(enhanced.identifier);
            } catch (e) {
                console.log("Could not load voices", e);
            }
        })();
    }, []);



    const handleVoiceResponse = (data: any) => {
        if (data.answer) {
            setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
            if (!isMuted) {
                Speech.speak(data.answer, { rate: 0.9 });
            }
        }
        if (data.action === "NEXT_STEP") setCurrentStep(p => Math.min(p + 1, recipe.instructions.length - 1));
        if (data.action === "PREVIOUS_STEP") setCurrentStep(p => Math.max(p - 1, 0));
    };

    const setRecordingAudioMode = async () => {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    };

    const setPlaybackAudioMode = async () => {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    };
    async function stopRecording() {
        if (!recording || !recipe) return;
        // setRecording(null);
        setIsProcessing(true);

        const cleanForSpeech = (text: string) => {
            return text
                .replace(/\s+/g, ' ')
                .replace(/•/g, '')
                .replace(/\b(\d+)\)/g, 'Step $1.')
                .trim();
        };


        try {
            await recording.stopAndUnloadAsync();
            setRecording(null);
            await setPlaybackAudioMode();

            // This forces the audio back to the main speaker and increases volume
            // await Audio.setAudioModeAsync({
            //     allowsRecordingIOS: false,
            //     playsInSilentModeIOS: true,
            //     // InterruptionModeIOS.DoNotMix ensures we have full control
            //     interruptionModeIOS: 1,
            //     // This is the "Magic" setting for iOS speaker output
            //     shouldDuckAndroid: true,
            //     playThroughEarpieceAndroid: false,
            // });
            const uri = recording.getURI();
            console.log('Recording stopped. File at:', uri);

            // Create Form Data
            const formData = new FormData();
            // @ts-ignore (React Native FormData requires this structure for files)
            formData.append('file', {
                uri: uri,
                name: 'recording.m4a',
                type: 'audio/m4a',
            });
            formData.append('currentStep', currentStep.toString());
            formData.append('recipeContext', JSON.stringify(recipe));
            const { data, error } = await supabase.functions.invoke('process-voice', {
                body: formData,
                //headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (data) {
                console.log("AI Response:", data);

                // Save User Message (Transcript) and AI Message (Answer)
                const newMessages: { role: 'user' | 'assistant', text: string }[] = [];
                if (data.transcript) {
                    newMessages.push({ role: 'user', text: data.transcript });
                }

                if (data.answer) {
                    newMessages.push({ role: 'assistant', text: data.answer });
                }

                setMessages(prev => [...prev, ...newMessages]);


                // 1. Handle Navigation
                if (data.action === "NEXT_STEP") {
                    setCurrentStep(prev => Math.min(prev + 1, recipe.instructions.length - 1));
                } else if (data.action === "PREVIOUS_STEP") {
                    setCurrentStep(prev => Math.max(prev - 1, 0));
                }

                // 2. Talk Back
                if (data.answer && !isMutedRef.current) {
                    // Re-confirm audio mode right before speaking
                    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                    if (Platform.OS === 'ios') {
                        await Audio.setAudioModeAsync({
                            allowsRecordingIOS: false,
                            playsInSilentModeIOS: true,
                        });
                    }
                    //Speech.speak(data.answer, { voice: selectedVoice, pitch: 1.0, rate: 0.95, volume: 1.0 });
                    await Speech.stop();
                    Speech.speak(cleanForSpeech(data.answer), {
                        voice: selectedVoice,
                        rate: 0.9,
                        pitch: 1.0,
                        volume: 1.0,
                    });

                }
            }

            if (error) {
                console.error("Supabase function error:", error);
                return;
            }

            if (!data) {
                console.error("No data returned from AI");
                return;
            }


        } catch (error) {
            console.error('Voice processing error', error);
        } finally {
            setIsProcessing(false);
        }
    }
    const finishCooking = async () => {
        try {
            // Stop any speaking immediately
            await Speech.stop();

            // If currently recording, stop it safely
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch { }
                setRecording(null);
            }

            // Mark session inactive (and optionally reset)
            await supabase
                .from("cooking_sessions")
                .update({
                    is_active: false,
                    last_updated: new Date().toISOString(),
                    // optional resets:
                    // current_step: 0,
                    // chat_history: [],
                })
                .eq("recipe_id", id);

            // Optional local reset so UI doesn't briefly show old state
            setCurrentStep(0);
            setMessages([]);
            setShowChat(false);
            setShowIngredients(false);

            // Navigate out
            //router.back(); // or router.replace("/(tabs)") or router.push("/(tabs)")
            router.replace("/(tabs)")
        } catch (e) {
            console.error("finishCooking error:", e);
            // even if db update fails, still exit so the user isn't stuck
            router.back();
        }
    };


    if (!recipe) return <View className="flex-1 bg-white" />;
    const instructions: string[] = Array.isArray(recipe.instructions) ? recipe.instructions : [];
    const ingredients: string[] = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    const totalSteps = instructions.length;

    // clamp currentStep so it never goes out of range
    const safeStep = totalSteps > 0 ? Math.min(Math.max(currentStep, 0), totalSteps - 1) : 0;

    return (
        <View className="flex-1 bg-white">
            {/* CLEAN HEADER: Fixed spacing to prevent overlap */}
            <View className="px-8 pt-16 pb-4 flex-row justify-between items-center bg-white z-20">
                <TouchableOpacity
                    onPress={() => setShowIngredients(true)}
                    className="flex-row items-center bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100"
                >
                    <List size={20} color="#64748B" />
                    <Text className="ml-2 font-bold text-slate-600">Ingredients</Text>
                </TouchableOpacity>

                {/* <View className="items-center">
                    <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{totalSteps > 0
                        ? `Step ${safeStep + 1} of ${totalSteps}`
                        : `No steps found`}
                    </Text>
                </View> */}

                {/* <TouchableOpacity onPress={() => setIsMuted(!isMuted)} className="p-3 bg-slate-50 rounded-2xl">
                    {isMuted ? <VolumeX size={20} color="#EF4444" /> : <Volume2 size={20} color="#10b981" />}
                </TouchableOpacity> */}
                <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                        onPress={() => setIsMuted(!isMuted)}
                        className="p-3 bg-slate-50 rounded-2xl"
                    >
                        {isMuted ? <VolumeX size={20} color="#EF4444" /> : <Volume2 size={20} color="#10b981" />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={finishCooking}
                        className="p-3 bg-red-500 rounded-2xl shadow-sm active:bg-red-600"

                    >
                        <Text className="text-slate-600 font-bold text-xs">Finish</Text>
                    </TouchableOpacity>
                </View>

            </View>
            <View className="px-8 pt-2 pb-2 justify-between items-center bg-white z-20">
                <View className="items-center">
                    <Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] ">{totalSteps > 0
                        ? `Step ${safeStep + 1} of ${totalSteps}`
                        : `No steps found`}
                    </Text>
                </View>
            </View>

            {/* THE STAGE: Improved text scaling and spacing */}
            <View className="flex-1 px-8 items-center justify-center">
                <View className="h-2/3 justify-center w-full">
                    <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                        numberOfLines={10}
                        className="text-5xl font-black text-slate-900 leading-[54px] text-center tracking-tight"
                    >
                        {/* {recipe.instructions[currentStep]} */}
                        {/* {instructions[safeStep]} */}
                        {totalSteps > 0
                            ? instructions[safeStep]
                            : "No instructions were found for this recipe. You can re-import or edit it."}

                    </Text>
                </View>

                {/* NEXT PREVIEW: Tighter positioning */}
                <View className="h-12 mt-2 justify-center">
                    {/* {safeStep < instructions.length - 1 && (
                        <Text className="text-slate-300 font-semibold text-center italic text-base">
                            Next: {instructions[safeStep + 1].substring(0, 50)}...
                        </Text>
                    )} */}
                    {totalSteps > 0 && safeStep < totalSteps - 1 && (
                        <Text className="text-slate-300 font-semibold text-center italic text-base">
                            Next: {instructions[safeStep + 1].substring(0, 50)}...
                        </Text>
                    )}

                </View>
            </View>

            {/* FOOTER CONTROLS */}
            <View className="pb-16 items-center">
                <TouchableOpacity
                    onPress={() => setShowChat(true)} // This ensures the modal opens
                    className="mb-6 flex-row items-center bg-slate-100 px-6 py-3 rounded-full border border-slate-200"
                >
                    <MessageCircle color="#64748B" size={18} />
                    <Text className="text-slate-600 font-bold ml-2 text-base">View Chat</Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                    onLongPress={async () => {
                        try {
                            const permission = await Audio.requestPermissionsAsync();
                            if (permission.status !== 'granted') return;

                            await Audio.setAudioModeAsync({
                                allowsRecordingIOS: true,
                                playsInSilentModeIOS: true,
                            });

                            await Speech.stop();
                            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                            setRecording(recording);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch (err) {
                            console.error('Failed to start recording', err);
                        }
                    }}
                    onPressOut={stopRecording}
                    className={`h-24 w-24 rounded-full items-center justify-center shadow-xl ${recording ? 'bg-red-500 scale-110' : 'bg-primary'}`}
                >
                    <Mic color="white" size={32} />
                </TouchableOpacity> */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        disabled={isProcessing} // prevents accidental double submits
                        onLongPress={async () => {
                            try {
                                const permission = await Audio.requestPermissionsAsync();
                                if (permission.status !== 'granted') return;

                                // await Audio.setAudioModeAsync({
                                //     allowsRecordingIOS: true,
                                //     playsInSilentModeIOS: true,
                                // });
                                await setRecordingAudioMode();


                                await Speech.stop();
                                const { recording } = await Audio.Recording.createAsync(
                                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                                );
                                setRecording(recording);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch (err) {
                                console.error('Failed to start recording', err);
                            }
                        }}
                        onPressOut={stopRecording}
                        className={`h-24 w-24 rounded-full items-center justify-center shadow-xl ${recording ? 'bg-red-500' : isProcessing ? 'bg-slate-400' : 'bg-primary'
                            }`}
                    >
                        <Mic color="white" size={32} />
                    </TouchableOpacity>
                </Animated.View>

                <Text className="mt-4 text-slate-300 font-bold text-[10px] tracking-widest uppercase">
                    {recording ? 'Listening' : isProcessing ? 'Thinking' : 'Hold to Talk'}
                </Text>
            </View>

            {/* INGREDIENTS MODAL */}
            <Modal visible={showIngredients} animationType="fade" transparent>
                <View className="flex-1 bg-slate-900/50 justify-center px-8">
                    <View className="bg-white rounded-[40px] p-8 max-h-[70%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-slate-900">Ingredients</Text>
                            <TouchableOpacity onPress={() => setShowIngredients(false)} className="bg-slate-100 p-2 rounded-full">
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* {recipe.ingredients.map((item: string, i: number) => (
                                <Text key={i} className="text-lg text-slate-600 py-3 border-b border-slate-50">• {item}</Text>
                            ))} */}
                            {ingredients.length === 0 ? (
                                <Text className="text-slate-500">No ingredients found.</Text>
                            ) : (
                                ingredients.map((item: string, i: number) => (
                                    <Text key={i} className="text-lg text-slate-600 py-3 border-b border-slate-50">
                                        • {item}
                                    </Text>
                                ))
                            )}

                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* CHAT MODAL (Logic remains, styles updated for "Professional" look) */}
            {/* ... [Chat Modal remains similar but use messages state] ... */}
            {/* --- CHAT MODAL --- */}
            <Modal
                visible={showChat}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowChat(false)} // Required for Android back button
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-[40px] h-[80%] shadow-2xl">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center px-8 py-6 border-b border-slate-100">
                            <View>
                                <Text className="text-2xl font-bold text-slate-900">Sous Chef</Text>
                                <Text className="text-slate-400 text-xs uppercase font-bold tracking-widest">Session History</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowChat(false)}
                                className="bg-slate-100 p-2 rounded-full"
                            >
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Message List */}
                        <ScrollView
                            ref={scrollRef}
                            className="flex-1 p-6"
                            contentContainerStyle={{ paddingBottom: 60 }}
                            onContentSizeChange={() => {
                                if (showChat) scrollToBottom();
                            }}
                        >
                            {messages.length === 0 ? (
                                <View className="items-center mt-20">
                                    <MessageCircle size={48} color="#CBD5E1" />
                                    <Text className="text-slate-400 mt-4 font-medium">No messages in this session yet.</Text>
                                </View>
                            ) : (
                                messages.map((m, i) => (
                                    <View key={i} className={`mb-6 p-5 rounded-[24px] max-w-[85%] ${m.role === 'user' ? 'bg-primary/10 self-end rounded-tr-none' : 'bg-slate-100 self-start rounded-tl-none'
                                        }`}>
                                        <Text className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                                            {m.role === 'user' ? 'You' : 'Chef'}
                                        </Text>
                                        <Text className="text-slate-800 text-lg leading-6">{m.text}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}