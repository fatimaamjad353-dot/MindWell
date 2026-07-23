// app/screens/PaymentScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { bookSessionApi, createPaymentIntentApi, confirmPaymentApi } from '../utils/apiService';

export default function PaymentScreen({ navigation, route }) {
  const { therapist, sessionType, appointmentDate, appointmentTime } = route.params || {};
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const formattedDate = useMemo(
    () =>
      appointmentDate
        ? new Date(appointmentDate).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Not selected',
    [appointmentDate]
  );

  const buildAppointmentDateTime = () => {
    if (!appointmentDate || !appointmentTime) return null;
    const date = new Date(appointmentDate);
    const [timeValue, meridiem] = appointmentTime.split(' ');
    let [hours, minutes] = timeValue.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };

  const handlePayment = async () => {
    if (!therapist || !appointmentDate || !appointmentTime) {
      Alert.alert('Booking incomplete', 'Please go back and select therapist, date and time.');
      return;
    }

    setLoading(true);

    try {
      // ── STEP 1: Book the session ──────────────────────────
      const bookingPayload = {
        psychiatristId: therapist.id,
        dateTime: buildAppointmentDateTime(),
        sessionType: sessionType || 'Video',
        agreedRate: therapist.fee || 2500,
        notes: 'Booked from MindWell app',
        bookingSource: 'Manual',
      };

      const booking = await bookSessionApi(bookingPayload);
      const sessionId = booking?.data?._id || booking?.session?.id;

      if (!sessionId) {
        throw new Error('Session booking failed — no session ID returned');
      }

      console.log('✅ Session booked:', sessionId);

      // ── STEP 2: Create Payment Intent ─────────────────────
      const paymentIntentResult = await createPaymentIntentApi({ sessionId });
      const { clientSecret } = paymentIntentResult.data;

      console.log('✅ Payment intent created');

      // ── STEP 3: Initialize Stripe Payment Sheet ───────────
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'MindWell',
        paymentIntentClientSecret: clientSecret,
        style: 'alwaysLight',           // ✅ forces light mode — fixes white text issue
        appearance: {
          colors: {
            primary: '#6C63FF',
            background: '#ffffff',          // ✅ white background
            componentBackground: '#F8F9FA', // ✅ light grey input background
            componentText: '#1a1a2e',       // ✅ dark text in inputs
            componentPlaceholderText: '#999999', // ✅ visible placeholder
            componentBorder: '#dddddd',
            primaryText: '#1a1a2e',         // ✅ dark labels
            secondaryText: '#666666',       // ✅ dark secondary text
            icon: '#6C63FF',
            error: '#FF6B6B',
          },
          shapes: {
            borderRadius: 12,
            borderWidth: 1.5,
          },
          primaryButton: {
            colors: {
              background: '#6C63FF',
              text: '#ffffff',
              border: '#6C63FF',
            },
          },
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // ── STEP 4: Present Payment Sheet ─────────────────────
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          Alert.alert(
            'Payment Cancelled',
            'You cancelled the payment. Your session is still pending.'
          );
          return;
        }
        throw new Error(paymentError.message);
      }

      // ── STEP 5: Confirm on backend ────────────────────────
      await confirmPaymentApi({
        paymentIntentId: clientSecret.split('_secret_')[0]
      });

      console.log('✅ Payment confirmed');

      // ── STEP 6: Success ───────────────────────────────────
      Alert.alert(
        'Payment Successful! 🎉',
        `Your session with ${therapist.name} is booked for ${formattedDate} at ${appointmentTime}.\n\nSession Type: ${sessionType}\nAmount: PKR ${therapist.fee || 2500}`,
        [
          {
            text: 'View Sessions',
            onPress: () => navigation.replace('SessionLogs', { recentBookingId: sessionId }),
          },
          {
            text: 'Back to Home',
            onPress: () => navigation.replace('PatientDashboard'),
          },
        ]
      );

    } catch (error) {
      console.error('❌ Payment error:', error.message);
      Alert.alert(
        'Payment Failed',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Booking Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Therapist</Text>
          <Text style={styles.summaryValue}>{therapist?.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Session Type</Text>
          <Text style={styles.summaryValue}>{sessionType}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValueSmall}>{formattedDate}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>{appointmentTime || 'Not selected'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>45 minutes</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>PKR {therapist?.fee || 2500}</Text>
        </View>
      </View>

      {/* Stripe Security Info */}
      <View style={styles.stripeInfo}>
        <Text style={styles.stripeIcon}>🔒</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripeTitle}>Secure Payment via Stripe</Text>
          <Text style={styles.stripeSub}>
            Your card details are encrypted and never stored on our servers.
          </Text>
        </View>
      </View>

      {/* Test Card Info */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>💳 Test Card Details</Text>
        <Text style={styles.testText}>Card Number: 4242 4242 4242 4242</Text>
        <Text style={styles.testText}>Expiry: Any future date (e.g. 12/26)</Text>
        <Text style={styles.testText}>CVV: Any 3 digits (e.g. 123)</Text>
        <Text style={styles.testText}>ZIP: Any 5 digits (e.g. 42424)</Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payBtn, loading && styles.payBtnDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>
            Pay PKR {therapist?.fee || 2500} with Stripe →
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: { fontSize: 14, color: '#888' },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  summaryValueSmall: {
    flex: 1,
    marginLeft: 20,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  totalRow: { borderBottomWidth: 0, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#6C63FF' },
  stripeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  stripeIcon: { fontSize: 24 },
  stripeTitle: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
  stripeSub: { fontSize: 11, color: '#555', marginTop: 2 },
  testCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C63FF',
    marginBottom: 8,
  },
  testText: { fontSize: 12, color: '#555', marginBottom: 4 },
  payBtn: {
    backgroundColor: '#6C63FF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  payBtnDisabled: { opacity: 0.65 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});