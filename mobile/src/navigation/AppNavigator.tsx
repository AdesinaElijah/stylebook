import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
// Auth Screens
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import CustomerLoginScreen from '../screens/auth/CustomerLoginScreen';
import OwnerLoginScreen from '../screens/auth/OwnerLoginScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
// Customer Screens
import HomeScreen from '../screens/customer/HomeScreen';
import ShopProfileScreen from '../screens/customer/ShopProfileScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import BookingsScreen from '../screens/customer/BookingsScreen';
import FeedScreen from '../screens/customer/FeedScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';
import SavedShopsScreen from '../screens/customer/SavedShopsScreen';
import MyReviewsScreen from '../screens/customer/MyReviewsScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';
// Owner Screens
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerBookingsScreen from '../screens/owner/OwnerBookingsScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';
import CreatePostScreen from '../screens/owner/CreatePostScreen';
import OwnerReviewsScreen from '../screens/owner/OwnerReviewsScreen';
import OwnerSettingsScreen from '../screens/owner/OwnerSettingsScreen';
import OpeningHoursScreen from '../screens/owner/OpeningHoursScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomerTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function OwnerTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerBookings"
        component={OwnerBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerProfile"
        component={OwnerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OwnerSettings"
        component={OwnerSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={!user ? 'Onboarding' : undefined}>
        {!user ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="CustomerLogin" component={CustomerLoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="OwnerLogin" component={OwnerLoginScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : user.role === 'CUSTOMER' ? (
          <>
            <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
            <Stack.Screen name="ShopProfile" component={ShopProfileScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="SavedShops" component={SavedShopsScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="OwnerReviews" component={OwnerReviewsScreen} />
            <Stack.Screen name="OpeningHours" component={OpeningHoursScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}