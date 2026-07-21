// App.js
import React, { useState, useEffect, useRef } from 'react';  // ← Make sure React is imported
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking, Alert, View, Text, ActivityIndicator } from 'react-native';

// Import all screens
import SplashScreen from './app/screens/SplashScreen';
import LanguageScreen from './app/screens/LanguageScreen';
import RoleScreen from './app/screens/RoleScreen';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import OTPScreen from './app/screens/OTPScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './app/screens/ResetPasswordScreen';
import PatientDashboard from './app/screens/PatientDashboard';
import PsychologistDashboard from './app/screens/PsychologistDashboard';
import ChatScreen from './app/screens/ChatScreen';
import FindTherapistScreen from './app/screens/FindTherapistScreen';
import BookingScreen from './app/screens/BookingScreen';
import PaymentScreen from './app/screens/PaymentScreen';
import MoodLogScreen from './app/screens/MoodLogScreen';
import ProgressScreen from './app/screens/ProgressScreen';
import SessionLogsScreen from './app/screens/SessionLogsScreen';
import RecommendationsScreen from './app/screens/RecommendationsScreen';
import RiskAlertScreen from './app/screens/RiskAlertScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import NotificationSettingsScreen from './app/screens/NotificationSettingsScreen';
import PrivacySecurityScreen from './app/screens/PrivacySecurityScreen';
import AdminScreen from './app/screens/AdminScreen';
import PsychAppointmentsScreen from './app/screens/PsychAppointmentsScreen';
import PsychEarningsScreen from './app/screens/PsychEarningsScreen';
import PsychMessagesScreen from './app/screens/PsychMessagesScreen';
import PsychPatientListScreen from './app/screens/PsychPatientListScreen';
import PsychPatientSummaryScreen from './app/screens/PsychPatientSummaryScreen';
import PsychScheduleScreen from './app/screens/PsychScheduleScreen';
import PsychSessionNotesScreen from './app/screens/PsychSessionNotesScreen';
import PsychPrescriptionsScreen from './app/screens/PsychPrescriptionsScreen';
import SessionRoomScreen from './app/screens/SessionRoomScreen';
import TextSessionScreen from './app/screens/TextSessionScreen';
import TwilioCallScreen from './app/screens/TwilioCallScreen';
import TwoFactorScreen from './app/screens/TwoFactorScreen';

const Stack = createStackNavigator();

// ─── Deep linking configuration ──────────────────────────────
const linking = {
  prefixes: [
    'mindwell://',
    'https://mindwell.com',
    'http://localhost:8081',
  ],
  config: {
    screens: {
      ResetPassword: {
        path: 'reset-password',
        parse: {
          token: (token) => `${token}`,
          role: (role) => `${role}`,
        },
      },
    },
  },
};

export default function App() {
  const navigationRef = useRef();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ─── Handle deep links manually ─────────────────────────────
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log('🔗 Deep link received:', url);
      
      const match = url.match(/reset-password\?token=([^&]+)&role=([^&]+)/);
      if (match) {
        const token = match[1];
        const role = match[2];
        console.log('📧 Token:', token);
        console.log('👤 Role:', role);
        
        setTimeout(() => {
          navigationRef.current?.navigate('ResetPassword', { token, role });
        }, 500);
      }
    };

    // ─── Add event listener ────────────────────────────────────
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // ─── Check if app was opened from a link ──────────────────
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 App opened from link:', url);
        handleDeepLink({ url });
      }
      setLoading(false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6C63FF' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 12, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Role" component={RoleScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
        <Stack.Screen name="PsychologistDashboard" component={PsychologistDashboard} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="FindTherapist" component={FindTherapistScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="MoodLog" component={MoodLogScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="SessionLogs" component={SessionLogsScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="RiskAlert" component={RiskAlertScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="PsychAppointments" component={PsychAppointmentsScreen} />
        <Stack.Screen name="PsychEarnings" component={PsychEarningsScreen} />
        <Stack.Screen name="PsychMessages" component={PsychMessagesScreen} />
        <Stack.Screen name="PsychPatientList" component={PsychPatientListScreen} />
        <Stack.Screen name="PsychPatientSummary" component={PsychPatientSummaryScreen} />
        <Stack.Screen name="PsychSchedule" component={PsychScheduleScreen} />
        <Stack.Screen name="PsychSessionNotes" component={PsychSessionNotesScreen} />
        <Stack.Screen name="PsychPrescriptions" component={PsychPrescriptionsScreen} />
        <Stack.Screen name="SessionRoom" component={SessionRoomScreen} />
        <Stack.Screen name="TextSession" component={TextSessionScreen} />
        <Stack.Screen name="TwilioCall" component={TwilioCallScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}