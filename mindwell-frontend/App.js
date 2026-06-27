import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LanguageProvider } from './app/context/LanguageContext';

import SplashScreen from './app/screens/SplashScreen';
import RoleScreen from './app/screens/RoleScreen';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import TwoFactorScreen from './app/screens/TwoFactorScreen';

import PatientDashboard from './app/screens/PatientDashboard';
import ChatScreen from './app/screens/ChatScreen';
import FindTherapistScreen from './app/screens/FindTherapistScreen';
import BookingScreen from './app/screens/BookingScreen';
import MoodLogScreen from './app/screens/MoodLogScreen';
import SessionLogsScreen from './app/screens/SessionLogsScreen';
import PaymentScreen from './app/screens/PaymentScreen';
import ProgressScreen from './app/screens/ProgressScreen';
import RecommendationsScreen from './app/screens/RecommendationsScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import SettingsScreen from './app/screens/SettingsScreen';
import NotificationSettingsScreen from './app/screens/NotificationSettingsScreen';
import PrivacySecurityScreen from './app/screens/PrivacySecurityScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import LanguageScreen from './app/screens/LanguageScreen';
import RiskAlertScreen from './app/screens/RiskAlertScreen';
import SessionRoomScreen from './app/screens/SessionRoomScreen';
import TwilioCallScreen from './app/screens/TwilioCallScreen';
import TextSessionScreen from './app/screens/TextSessionScreen';

import PsychologistDashboard from './app/screens/PsychologistDashboard';
import PsychPatientListScreen from './app/screens/PsychPatientListScreen';
import PsychPatientSummaryScreen from './app/screens/PsychPatientSummaryScreen';
import PsychScheduleScreen from './app/screens/PsychScheduleScreen';
import PsychEarningsScreen from './app/screens/PsychEarningsScreen';
import PsychSessionNotesScreen from './app/screens/PsychSessionNotesScreen';
import PsychAppointmentsScreen from './app/screens/PsychAppointmentsScreen';

import AdminScreen from './app/screens/AdminScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <LanguageProvider>
      <KeyboardAvoidingView
        style={styles.app}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Role" component={RoleScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />

          <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="FindTherapist" component={FindTherapistScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="MoodLog" component={MoodLogScreen} />
          <Stack.Screen name="SessionLogs" component={SessionLogsScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="RiskAlert" component={RiskAlertScreen} />
          <Stack.Screen name="SessionRoom" component={SessionRoomScreen} />
          <Stack.Screen name="TwilioCall" component={TwilioCallScreen} />
          <Stack.Screen name="TextSession" component={TextSessionScreen} />

          <Stack.Screen name="PsychologistDashboard" component={PsychologistDashboard} />
          <Stack.Screen name="PsychPatientList" component={PsychPatientListScreen} />
          <Stack.Screen name="PsychPatientSummary" component={PsychPatientSummaryScreen} />
          <Stack.Screen name="PsychSchedule" component={PsychScheduleScreen} />
          <Stack.Screen name="PsychEarnings" component={PsychEarningsScreen} />
          <Stack.Screen name="PsychSessionNotes" component={PsychSessionNotesScreen} />
          <Stack.Screen name="PsychAppointments" component={PsychAppointmentsScreen} />

          <Stack.Screen name="Admin" component={AdminScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </KeyboardAvoidingView>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 }
});
