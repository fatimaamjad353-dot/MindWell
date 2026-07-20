// app/screens/PaymentScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { bookSessionApi } from '../utils/apiService';

const onlyDigits = (value) => value.replace(/\D/g, '');

const formatCardNumber = (value) =>
  onlyDigits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

const formatExpiry = (value) => {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const passesLuhnCheck = (number) => {
  let sum = 0;
  let doubleDigit = false;

  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
};

const isValidExpiry = (value) => {
  if (!/^\d{2}\/\d{2}$/.test(value)) return false;
  const [month, year] = value.split('/').map(Number);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const fullYear = 2000 + year;
  const expiryEnd = new Date(fullYear, month, 0, 23, 59, 59);
  return expiryEnd >= now;
};

export default function PaymentScreen({ navigation, route }) {
  const { therapist, sessionType, appointmentDate, appointmentTime } = route.params || {};
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
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

  const validate = () => {
    const nextErrors = {};
    const cardDigits = onlyDigits(cardNumber);
    const trimmedName = name.trim();

    if (!/^[A-Za-z][A-Za-z .'-]{2,}$/.test(trimmedName)) {
      nextErrors.name = 'Enter the cardholder’s full name.';
    }
    if (cardDigits.length < 13 || cardDigits.length > 19 || !passesLuhnCheck(cardDigits)) {
      nextErrors.cardNumber = 'Enter a valid 13–19 digit card number.';
    }
    if (!isValidExpiry(expiry)) {
      nextErrors.expiry = 'Use a valid future date in MM/YY format.';
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      nextErrors.cvv = 'CVV must contain 3 or 4 digits.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

// In PaymentScreen.js - update the booking payload

const handlePayment = async () => {
  if (!validate()) return;
  if (!therapist || !appointmentDate || !appointmentTime) {
    Alert.alert('Booking incomplete', 'Please return and select the therapist, date, and time again.');
    return;
  }

  setLoading(true);
  console.log('[PaymentScreen] booking request', {
    therapist: therapist?.name,
    appointmentDate,
    appointmentTime,
    sessionType,
  });

  try {
    // ── Build the session booking payload ──────────────────
    const bookingPayload = {
      psychiatristId: therapist.id,
      dateTime: buildAppointmentDateTime(),
      sessionType: sessionType || 'video',
      agreedRate: therapist.fee || 2500,
      notes: 'Booked from MindWell app',
      bookingSource: 'Manual', // Use 'Manual' or 'AI_Recommended'
    };

    console.log('[PaymentScreen] booking payload:', bookingPayload);

    const booking = await bookSessionApi(bookingPayload);

    console.log('[PaymentScreen] booking success', booking);

    Alert.alert(
      'Payment Successful! 🎉',
      `Your session with ${therapist.name} is booked for ${formattedDate} at ${appointmentTime}.\n\nSession Type: ${sessionType}\nAmount: PKR ${therapist.fee || 2500}\n\nYou can view your sessions in the "My Sessions" tab.`,
      [
        {
          text: 'View Sessions',
          onPress: () =>
            navigation.replace('SessionLogs', {
              recentBookingId: booking?.session?.id || booking?.data?._id,
            }),
        },
        {
          text: 'Back to Home',
          onPress: () => navigation.replace('PatientDashboard'),
        },
      ]
    );
  } catch (error) {
    console.log('[PaymentScreen] booking failed', error.message || error);
    Alert.alert(
      'Booking Error',
      error.message || 'The booking could not be saved. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};
  const clearError = (field) => {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

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

      <View style={styles.form}>
        <Text style={styles.formTitle}>Card Details</Text>

        <Text style={styles.label}>Cardholder Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="Name exactly as shown on card"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearError('name');
          }}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={[styles.input, errors.cardNumber && styles.inputError]}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor="#aaa"
          value={cardNumber}
          onChangeText={(value) => {
            setCardNumber(formatCardNumber(value));
            clearError('cardNumber');
          }}
          keyboardType="number-pad"
          maxLength={23}
          autoComplete="cc-number"
        />
        {errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={[styles.input, errors.expiry && styles.inputError]}
              placeholder="MM/YY"
              placeholderTextColor="#aaa"
              value={expiry}
              onChangeText={(value) => {
                setExpiry(formatExpiry(value));
                clearError('expiry');
              }}
              keyboardType="number-pad"
              maxLength={5}
              autoComplete="cc-exp"
            />
            {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={[styles.input, errors.cvv && styles.inputError]}
              placeholder="123"
              placeholderTextColor="#aaa"
              value={cvv}
              onChangeText={(value) => {
                setCvv(onlyDigits(value).slice(0, 4));
                clearError('cvv');
              }}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoComplete="cc-csc"
            />
            {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
          </View>
        </View>

        <Text style={styles.testHint}>
          💳 Test Card: 4242 4242 4242 4242 • Any future expiry • Any CVV
        </Text>
      </View>

      <View style={styles.secureNote}>
        <Text style={styles.secureText}>
          🔒 Demo only—card details are validated locally and are not stored.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.payBtn, loading && styles.payBtnDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>Confirm & Pay PKR {therapist?.fee || 2500} →</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
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
  summaryTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: { fontSize: 14, color: '#888' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#333', textTransform: 'capitalize' },
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
  form: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 3 },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#F8F9FA',
  },
  inputError: { borderColor: '#E53935', backgroundColor: '#FFF8F8' },
  errorText: { color: '#E53935', fontSize: 11, marginTop: 5, lineHeight: 15 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  testHint: { color: '#6C63FF', fontSize: 11, lineHeight: 16, marginTop: 16, fontWeight: '500' },
  secureNote: { margin: 16, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12 },
  secureText: { color: '#1D9E75', fontSize: 12, textAlign: 'center', fontWeight: '500', lineHeight: 17 },
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
  bottomSpace: { height: 30 },
});