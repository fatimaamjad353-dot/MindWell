import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKINGS_KEY = '@mindwell/bookings';

export async function getBookings() {
  try {
    const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
    const bookings = stored ? JSON.parse(stored) : [];
    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
}

export async function saveBooking(booking) {
  const bookings = await getBookings();
  const savedBooking = {
    ...booking,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'Upcoming',
    duration: '45 min',
    rated: false
  };

  await AsyncStorage.setItem(
    BOOKINGS_KEY,
    JSON.stringify([savedBooking, ...bookings])
  );
  return savedBooking;
}
