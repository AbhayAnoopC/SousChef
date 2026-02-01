import { Tabs } from 'expo-router';
import { Utensils, Refrigerator, Mic2 } from 'lucide-react-native';
//Might need to add one fmore screen for grocery list. Tab that shws the grocery oist and allpws users to export the grocery list Or use tha app ass the main grocerylist.
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#10b981', // Emerald Green
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        height: 60,
        paddingBottom: 8,
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <Utensils size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color }) => <Refrigerator size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Sous Chef',
          tabBarIcon: ({ color }) => <Mic2 size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}