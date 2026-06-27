import AsyncStorage from '@react-native-async-storage/async-storage';

const PSYCH_APPLICATIONS_KEY = '@mindwell/psychiatrist-applications';

const seedApplications = [
  {
    id: 'seed-1',
    name: 'Dr. Kamran Ali',
    email: 'kamran@example.com',
    specialty: 'CBT Therapy',
    verificationId: 'PMC-2019-4521',
    certifications: 'Aga Khan University, CBT certification',
    phone: '+92 300 1111111',
    status: 'pending',
    submittedAt: '2026-06-10T09:00:00.000Z',
  },
  {
    id: 'seed-2',
    name: 'Dr. Nadia Shah',
    email: 'nadia@example.com',
    specialty: 'Child Psychology',
    verificationId: 'PMC-2021-7823',
    certifications: 'LUMS, Child psychology certification',
    phone: '+92 300 2222222',
    status: 'pending',
    submittedAt: '2026-06-10T11:30:00.000Z',
  },
];

export async function getPsychiatristApplications() {
  try {
    const stored = await AsyncStorage.getItem(PSYCH_APPLICATIONS_KEY);
    const applications = stored ? JSON.parse(stored) : seedApplications;
    return Array.isArray(applications) ? applications : seedApplications;
  } catch {
    return seedApplications;
  }
}

export async function savePsychiatristApplication(application) {
  const applications = await getPsychiatristApplications();
  const normalizedEmail = application.email.trim().toLowerCase();
  const withoutExisting = applications.filter(item => item.email.toLowerCase() !== normalizedEmail);
  const savedApplication = {
    id: application.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: application.name.trim(),
    email: normalizedEmail,
    phone: application.phone?.trim() || '',
    specialty: application.specialty.trim(),
    verificationId: application.verificationId.trim(),
    certifications: application.certifications.trim(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };

  await AsyncStorage.setItem(
    PSYCH_APPLICATIONS_KEY,
    JSON.stringify([savedApplication, ...withoutExisting])
  );
  return savedApplication;
}

export async function updatePsychiatristApplicationStatus(id, status) {
  const applications = await getPsychiatristApplications();
  const updated = applications.map(item =>
    item.id === id
      ? { ...item, status, reviewedAt: new Date().toISOString() }
      : item
  );
  await AsyncStorage.setItem(PSYCH_APPLICATIONS_KEY, JSON.stringify(updated));
  return updated.find(item => item.id === id);
}

export async function getPsychiatristApplicationByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const applications = await getPsychiatristApplications();
  return applications.find(item => item.email.toLowerCase() === normalizedEmail) || null;
}
