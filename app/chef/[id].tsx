// import { Audio } from 'expo-av';
// import { useLocalSearchParams } from 'expo-router';
// import * as Speech from 'expo-speech';
// import { useEffect, useState } from 'react';
// import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { supabase } from '../../lib/supabase';

// interface Recipe {
//     id: number;
//     title: string;
//     description: string;
//     instructions: string[];
//     ingredients: string[];
//     image_url: string;
// }

// export default function ChefScreen() {
//     const { id } = useLocalSearchParams();
//     const [recipe, setRecipe] = useState<Recipe | null>(null);
//     const [currentStep, setCurrentStep] = useState(0);
//     const [recording, setRecording] = useState<Audio.Recording | null>(null);
//     const [isProcessing, setIsProcessing] = useState(false);
//     const [assistantText, setAssistantText] = useState('');
//     const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);

//     // EFFECT 1: Load recipe and existing session on mount
//     useEffect(() => {
//         const initializeChef = async () => {
//             // Fetch Recipe
//             const { data: recipeData } = await supabase.from('recipes').select('*').eq('id', id).single();
//             if (recipeData) setRecipe(recipeData);

//             // Fetch Previous Session to resume where we left off
//             const { data: sessionData } = await supabase
//                 .from('cooking_sessions')
//                 .select('current_step')
//                 .eq('recipe_id', id)
//                 .single();

//             if (sessionData) {
//                 setCurrentStep(sessionData.current_step);
//             }
//         };

//         initializeChef();
//     }, [id]);

//     // EFFECT 2: Sync to Supabase whenever the user moves to a new step
//     useEffect(() => {
//         if (recipe) {
//             const syncProgress = async () => {
//                 await supabase
//                     .from('cooking_sessions')
//                     .upsert({
//                         recipe_id: id,
//                         current_step: currentStep,
//                         last_updated: new Date().toISOString(),
//                         is_active: true
//                     }, { onConflict: 'recipe_id' });
//             };
//             syncProgress();
//         }
//     }, [currentStep, recipe]);

// async function startRecording() {
//     try {
//         // INTERRUPT: Stop any current speech before starting a new recording
//         await Speech.stop();
//         // 1. Request Permissions
//         const permission = await Audio.requestPermissionsAsync();
//         if (permission.status !== 'granted') return;

//         // 2. Configure Audio Mode for iOS
//         await Audio.setAudioModeAsync({
//             allowsRecordingIOS: true,
//             playsInSilentModeIOS: true,
//         });

//         // 3. Prepare & Start
//         const { recording } = await Audio.Recording.createAsync(
//             Audio.RecordingOptionsPresets.HIGH_QUALITY
//         );
//         setRecording(recording);
//         console.log('Recording started');
//     } catch (err) {
//         console.error('Failed to start recording', err);
//     }
// }

// async function stopRecording() {
//     if (!recording || !recipe) return;
//     setRecording(null);
//     setIsProcessing(true);

//     try {
//         await recording.stopAndUnloadAsync();
//         // This forces the audio back to the main speaker and increases volume
//         await Audio.setAudioModeAsync({
//             allowsRecordingIOS: false,
//             playsInSilentModeIOS: true,
//             // InterruptionModeIOS.DoNotMix ensures we have full control
//             interruptionModeIOS: 1,
//             // This is the "Magic" setting for iOS speaker output
//             shouldDuckAndroid: true,
//             playThroughEarpieceAndroid: false,
//         });
//         const uri = recording.getURI();
//         console.log('Recording stopped. File at:', uri);

//         // Create Form Data
//         const formData = new FormData();
//         // @ts-ignore (React Native FormData requires this structure for files)
//         formData.append('file', {
//             uri: uri,
//             name: 'recording.m4a',
//             type: 'audio/m4a',
//         });
//         formData.append('currentStep', currentStep.toString());
//         formData.append('recipeContext', JSON.stringify(recipe));
//         const { data, error } = await supabase.functions.invoke('process-voice', {
//             body: formData,
//             //headers: { 'Content-Type': 'multipart/form-data' }
//         });
//         if (data) {
//             console.log("AI Response:", data);

//             // 1. Handle Navigation
//             if (data.action === "NEXT_STEP") {
//                 setCurrentStep(prev => Math.min(prev + 1, recipe.instructions.length - 1));
//             } else if (data.action === "PREVIOUS_STEP") {
//                 setCurrentStep(prev => Math.max(prev - 1, 0));
//             }

//             // 2. Talk Back
//             if (data.answer) {
//                 // Re-confirm audio mode right before speaking
//                 await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
//                 if (Platform.OS === 'ios') {
//                     await Audio.setAudioModeAsync({
//                         allowsRecordingIOS: false,
//                         playsInSilentModeIOS: true,
//                     });
//                 }
//                 Speech.speak(data.answer, { voice: selectedVoice, pitch: 1.0, rate: 0.95, volume: 1.0 });
//             }
//         }

//         if (error) {
//             console.error("Supabase function error:", error);
//             return;
//         }

//         if (!data) {
//             console.error("No data returned from AI");
//             return;
//         }

//         if (data.transcript) {
//             console.log("Heard:", data.transcript);
//             // Logic for handling the text response will go here
//         } else {
//             console.log("No transcript returned");
//         }

//         if (data.action === "NEXT_STEP") {
//             setCurrentStep(prev => Math.min(prev + 1, recipe.instructions.length - 1));
//         } else if (data.action === "PREVIOUS_STEP") {
//             setCurrentStep(prev => Math.max(prev - 1, 0));
//         }

//         // Show the AI's answer on screen
//         if (data.answer) {
//             setAssistantText(data.answer);
//             Speech.speak(data.answer, { voice: selectedVoice, pitch: 1.0, rate: 0.95, volume: 1.0 });
//         } else {
//             console.log("No answer from AI");
//         }

//     } catch (error) {
//         console.error('Voice processing error', error);
//     } finally {
//         setIsProcessing(false);
//     }
// }

//     useEffect(() => {
//         const getVoices = async () => {
//             const voices = await Speech.getAvailableVoicesAsync();
//             // Look for 'en-us' and 'premium' or 'enhanced' in the name
//             const betterVoice = voices.find(v => v.language === 'en-US' && v.name.includes('Enhanced'));
//             if (betterVoice) setSelectedVoice(betterVoice.identifier);
//         };
//         getVoices();
//         fetchRecipe();
//     }, [id]);



//     const fetchRecipe = async () => {
//         const { data } = await supabase.from('recipes').select('*').eq('id', id).single();
//         if (data) setRecipe(data);
//     };

//     if (!recipe) return <View style={styles.centered}><Text>Loading...</Text></View>;

//     return (
//         <View style={styles.container}>
//             <Text style={styles.header}>{recipe.title}</Text>

//             <ScrollView contentContainerStyle={styles.scrollContent}>
//                 {recipe.instructions.map((step, index) => (
//                     <View
//                         key={index}
//                         style={[
//                             styles.stepCard,
//                             index === currentStep && styles.activeStepCard
//                         ]}
//                     >
//                         <Text style={[styles.stepNumber, index === currentStep && styles.activeText]}>
//                             Step {index + 1}
//                         </Text>
//                         <Text style={[styles.stepText, index === currentStep && styles.activeText]}>
//                             {step}
//                         </Text>
//                     </View>
//                 ))}
//             </ScrollView>

//             {/* Placeholder for Voice Control (Milestone 3) */}
//             <View className="absolute bottom-0 w-full p-8 bg-white/90">
//                 <TouchableOpacity
//                     onLongPress={startRecording} // Press and hold starts
//                     onPressOut={stopRecording}   // Release stops
//                     delayLongPress={50}          // Makes it feel instant
//                     disabled={isProcessing}
//                     className={`h-24 rounded-full justify-center items-center shadow-lg ${recording ? 'bg-red-500 scale-105' : 'bg-accent'
//                         } ${isProcessing ? 'opacity-50' : ''}`}
//                 >
//                     <Text className="text-white text-xl font-bold">
//                         {recording ? 'Listening...' : isProcessing ? 'Thinking...' : 'Hold to Talk'}
//                     </Text>
//                 </TouchableOpacity>
//             </View>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#FFF' },
//     header: { fontSize: 22, fontWeight: 'bold', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
//     scrollContent: { padding: 20, paddingBottom: 120 },
//     stepCard: {
//         padding: 15,
//         borderRadius: 12,
//         backgroundColor: '#F9F9F9',
//         marginBottom: 15,
//         borderWidth: 1,
//         borderColor: '#EEE'
//     },
//     activeStepCard: {
//         backgroundColor: '#FFF4F2',
//         borderColor: '#FF6347',
//         elevation: 4,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//     },
//     stepNumber: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 4 },
//     stepText: { fontSize: 18, lineHeight: 26, color: '#333' },
//     activeText: { color: '#FF6347' },
//     footer: {
//         position: 'absolute',
//         bottom: 0,
//         width: '100%',
//         padding: 30,
//         backgroundColor: 'rgba(255,255,255,0.9)'
//     },
//     talkButton: {
//         backgroundColor: '#333',
//         height: 80,
//         borderRadius: 40,
//         justifyContent: 'center',
//         alignItems: 'center'
//     },
//     talkButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
//     centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
// });

import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { List, Mic, Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

interface Recipe {
    id: number;
    title: string;
    description: string;
    instructions: string[];
    ingredients: string[];
    image_url: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChefScreen() {
    const { id } = useLocalSearchParams();
    const [recipe, setRecipe] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showIngredients, setShowIngredients] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    //     const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    // const [isProcessing, setIsProcessing] = useState(false);
    const [assistantText, setAssistantText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);

    // Load Recipe & Session
    useEffect(() => {
        const loadData = async () => {
            const { data: rec } = await supabase.from('recipes').select('*').eq('id', id).single();
            if (rec) setRecipe(rec);

            const { data: ses } = await supabase.from('cooking_sessions').select('current_step').eq('recipe_id', id).maybeSingle();
            if (ses) setCurrentStep(ses.current_step);
        };
        loadData();
    }, [id]);

    // Sync Progress
    useEffect(() => {
        if (recipe) {
            supabase.from('cooking_sessions').upsert({
                recipe_id: id,
                current_step: currentStep,
                last_updated: new Date().toISOString(),
                is_active: true
            }, { onConflict: 'recipe_id' }).then();
        }
    }, [currentStep]);

    useEffect(() => {
        // Automatically scroll to the bottom of the conversation when messages update
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

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

    if (!recipe) return <View className="flex-1 justify-center items-center"><Text>Loading...</Text></View>;

    async function startRecording() {
        try {
            // INTERRUPT: Stop any current speech before starting a new recording
            await Speech.stop();
            // 1. Request Permissions
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return;

            // 2. Configure Audio Mode for iOS
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // 3. Prepare & Start
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        if (!recording || !recipe) return;
        setRecording(null);
        setIsProcessing(true);

        try {
            await recording.stopAndUnloadAsync();
            // This forces the audio back to the main speaker and increases volume
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                // InterruptionModeIOS.DoNotMix ensures we have full control
                interruptionModeIOS: 1,
                // This is the "Magic" setting for iOS speaker output
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
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
                if (data.answer && !isMuted) {
                    // Re-confirm audio mode right before speaking
                    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
                    if (Platform.OS === 'ios') {
                        await Audio.setAudioModeAsync({
                            allowsRecordingIOS: false,
                            playsInSilentModeIOS: true,
                        });
                    }
                    Speech.speak(data.answer, { voice: selectedVoice, pitch: 1.0, rate: 0.95, volume: 1.0 });
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

    return (
        <View className="flex-1 bg-white">
            {/* Header with Mute & Ingredients Toggle */}
            <View className="flex-row justify-between items-center px-6 pt-14 pb-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => setShowIngredients(!showIngredients)} className="flex-row items-center bg-gray-100 px-3 py-2 rounded-full">
                    <List size={18} color="#333" />
                    <Text className="ml-2 font-bold">Ingredients</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsMuted(!isMuted)} className="p-2 bg-gray-100 rounded-full">
                    {isMuted ? <VolumeX size={24} color="#FF6347" /> : <Volume2 size={24} color="#10b981" />}
                </TouchableOpacity>
            </View>

            <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
                {/* Ingredient Overlay */}
                {showIngredients && (
                    <View className="bg-gray-50 p-6 mx-6 mt-4 rounded-3xl border border-gray-100">
                        <Text className="font-bold text-lg mb-2">Ingredients</Text>
                        {recipe.ingredients.map((item: string, i: number) => (
                            <Text key={i} className="text-gray-600 py-1">• {item}</Text>
                        ))}
                    </View>
                )}

                {/* Conversation History Area */}
                <View className="px-6 mt-6">
                    <Text className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">Conversation</Text>
                    {messages.map((m, i) => (
                        <View key={i} className={`mb-4 p-4 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-primary/10 self-end' : 'bg-gray-100 self-start'}`}>
                            <Text className="text-gray-800">{m.text}</Text>
                        </View>
                    ))}
                </View>

                {/* CURRENT STEP (The Main Stage) */}
                <View className="px-6 mt-8">
                    <Text className="text-primary font-bold text-xl mb-2">Step {currentStep + 1} of {recipe.instructions.length}</Text>
                    <View className="bg-primary/5 p-8 rounded-[40px] border border-primary/10">
                        <Text className="text-2xl leading-10 text-accent font-medium">
                            {recipe.instructions[currentStep]}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Floating Bottom Controls */}
            <View className="absolute bottom-10 w-full px-10">
                <TouchableOpacity
                    className={`h-24 rounded-full flex-row items-center justify-center shadow-xl ${isProcessing ? 'bg-gray-400' : 'bg-accent'}`}
                    onLongPress={() => {/* Start Recording logic */ }}
                    onPressOut={() => {/* Stop Recording logic */ }}
                >
                    <Mic color="white" size={32} />
                    <Text className="text-white text-xl font-bold ml-4">
                        {isProcessing ? 'Thinking...' : 'Hold to Talk'}
                    </Text>
                </TouchableOpacity>
            </View>
            <View className="absolute bottom-10 w-full px-10">
                <TouchableOpacity
                    onLongPress={startRecording} // Press and hold starts
                    onPressOut={stopRecording}   // Release stops
                    delayLongPress={50}          // Makes it feel instant
                    disabled={isProcessing}
                    className={`h-24 rounded-full flex-row items-center justify-center shadow-xl ${recording ? 'bg-red-500 scale-105' : 'bg-accent'
                        } ${isProcessing ? 'opacity-50' : ''}`}
                >
                    <Mic color="white" size={32} />
                    <Text className="text-white text-xl font-bold ml-4">
                        {recording ? 'Listening...' : isProcessing ? 'Thinking...' : 'Hold to Talk'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
