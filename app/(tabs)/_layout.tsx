import { Tabs } from 'expo-router';
import { Mic2, Refrigerator, Utensils } from 'lucide-react-native';
import { SignOutButton } from '../_layout';
//Might need to add one fmore screen for grocery list. Tab that shws the grocery oist and allpws users to export the grocery list Or use tha app ass the main grocerylist.
export default function TabLayout() {
  return (

    <Tabs screenOptions={{
      tabBarActiveTintColor: '#10b981',
      headerShown: true,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: '#FDFDFD',
        height: 100, // Explicitly set a smaller height if needed
      },
      headerTitleStyle: {
        fontWeight: '700', // Make it bolder for that premium look
        fontSize: 24,
        color: '#0F172A'
      },
      headerRight: () => <SignOutButton />,
      // Add this to pull the title closer to the top if it feels too low
      headerTitleAlign: 'center',
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