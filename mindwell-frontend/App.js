// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageProvider } from './app/context/LanguageContext';

// Import screens
import SplashScreen from './app/screens/SplashScreen';
import LanguageScreen from './app/screens/LanguageScreen';
import RoleScreen from './app/screens/RoleScreen';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import OTPScreen from './app/screens/OTPScreen';  // ← ADD THIS
import PatientDashboard from './app/screens/PatientDashboard';
import PsychologistDashboard from './app/screens/PsychologistDashboard';
import AdminScreen from './app/screens/AdminScreen';
import ChatScreen from './app/screens/ChatScreen';
import FindTherapistScreen from './app/screens/FindTherapistScreen';
import MoodLogScreen from './app/screens/MoodLogScreen';
import ProgressScreen from './app/screens/ProgressScreen';
import SessionLogsScreen from './app/screens/SessionLogsScreen';
import BookingScreen from './app/screens/BookingScreen';
import PaymentScreen from './app/screens/PaymentScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import NotificationSettingsScreen from './app/screens/NotificationSettingsScreen';
import PrivacySecurityScreen from './app/screens/PrivacySecurityScreen';
import RecommendationsScreen from './app/screens/RecommendationsScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import TwoFactorScreen from './app/screens/TwoFactorScreen';
import TwilioCallScreen from './app/screens/TwilioCallScreen';
import TextSessionScreen from './app/screens/TextSessionScreen';
import PsychPatientListScreen from './app/screens/PsychPatientListScreen';
import PsychPatientSummaryScreen from './app/screens/PsychPatientSummaryScreen';
import PsychScheduleScreen from './app/screens/PsychScheduleScreen';
import PsychEarningsScreen from './app/screens/PsychEarningsScreen';
import PsychAppointmentsScreen from './app/screens/PsychAppointmentsScreen';
import PsychSessionNotesScreen from './app/screens/PsychSessionNotesScreen';
import PsychMessagesScreen from './app/screens/PsychMessagesScreen';
import PsychPrescriptionsScreen from './app/screens/PsychPrescriptionsScreen';
import RiskAlertScreen from './app/screens/RiskAlertScreen';
import CompleteRegistrationScreen from './app/screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Role" component={RoleScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          
          {/* ✅ ADD OTP SCREEN */}
          <Stack.Screen name="OTP" component={OTPScreen} />
          
          {/* ✅ ADD COMPLETE REGISTRATION SCREEN */}
          <Stack.Screen name="CompleteRegistration" component={CompleteRegistrationScreen} />
          
          <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
          <Stack.Screen name="PsychologistDashboard" component={PsychologistDashboard} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="FindTherapist" component={FindTherapistScreen} />
          <Stack.Screen name="MoodLog" component={MoodLogScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="SessionLogs" component={SessionLogsScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
          <Stack.Screen name="TwilioCall" component={TwilioCallScreen} />
          <Stack.Screen name="TextSession" component={TextSessionScreen} />
          <Stack.Screen name="PsychPatientList" component={PsychPatientListScreen} />
          <Stack.Screen name="PsychPatientSummary" component={PsychPatientSummaryScreen} />
          <Stack.Screen name="PsychSchedule" component={PsychScheduleScreen} />
          <Stack.Screen name="PsychEarnings" component={PsychEarningsScreen} />
          <Stack.Screen name="PsychAppointments" component={PsychAppointmentsScreen} />
          <Stack.Screen name="PsychSessionNotes" component={PsychSessionNotesScreen} />
          <Stack.Screen name="PsychMessages" component={PsychMessagesScreen} />
          <Stack.Screen name="PsychPrescriptions" component={PsychPrescriptionsScreen} />
          <Stack.Screen name="RiskAlert" component={RiskAlertScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}