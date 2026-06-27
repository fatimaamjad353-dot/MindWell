import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { City, Country } from 'country-state-city';
import { useLanguage } from '../context/LanguageContext';
import { getProfile, saveProfile } from '../utils/profileStorage';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: '',
  age: '',
  gender: '',
  country: '',
  countryIso: '',
  countryCallingCode: '',
  city: '',
  occupation: '',
  occupationOther: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  preferredContact: 'Phone',
  therapyGoals: '',
  medicalNotes: '',
  profileImage: ''
};

const GENDER_OPTIONS = [
  'Female',
  'Male',
  'Non-binary',
  'Prefer not to say'
];

const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Child',
  'Friend',
  'Guardian',
  'Other'
];

const OCCUPATION_OPTIONS = [
  'Student',
  'Employed',
  'Self-employed',
  'Healthcare professional',
  'Educator',
  'Homemaker',
  'Unemployed',
  'Retired',
  'Other'
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const validPersonName = value =>
  /^[A-Za-z\u0600-\u06FF' -]{2,60}$/.test(value);
const formatPhone = value => value.replace(/\D/g, '').slice(0, 14);

const buildInternationalPhone = (nationalNumber, callingCode) => {
  const code = String(callingCode || '').replace(/\D/g, '');
  let national = String(nationalNumber || '').replace(/\D/g, '');

  if (national.startsWith(code) && national.length > code.length + 5) {
    national = national.slice(code.length);
  }
  national = national.replace(/^0+/, '');

  const formatted = code && national ? `+${code}${national}` : '';
  const totalDigits = `${code}${national}`.length;
  return {
    valid: Boolean(code) && national.length >= 6 && totalDigits >= 8 && totalDigits <= 15,
    formatted
  };
};

const validateInternationalPhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return {
    valid: digits.length >= 8 && digits.length <= 15,
    formatted: digits ? `+${digits}` : ''
  };
};

const ageFromStoredBirthDate = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDifference = today.getMonth() - date.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age >= 13 && age <= 120 ? String(age) : '';
};

export default function ProfileScreen({ navigation, route }) {
  const { t } = useLanguage();
  const user = route.params?.user || {};
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selector, setSelector] = useState(null);

  const countryOptions = useMemo(
    () =>
      Country.getAllCountries()
        .map(country => ({
          label: `${country.flag || ''} ${country.name} (+${country.phonecode})`.trim(),
          value: country.name,
          isoCode: country.isoCode,
          phonecode: country.phonecode
        }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    []
  );

  const cityOptions = useMemo(
    () =>
      profile.countryIso
        ? City.getCitiesOfCountry(profile.countryIso)
            .map(city => ({ label: city.name, value: city.name }))
            .filter((city, index, list) =>
              list.findIndex(item => item.value === city.value) === index
            )
            .sort((a, b) => a.value.localeCompare(b.value))
        : [],
    [profile.countryIso]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getProfile({
        ...EMPTY_PROFILE,
        name: user.name || '',
        email: user.email || ''
      }).then(saved => {
        if (active) {
          const country = saved.countryIso
            ? Country.getCountryByCode(saved.countryIso)
            : null;
          const callingCode = saved.countryCallingCode ||
            String(country?.phonecode || '').replace(/\D/g, '');
          let nationalPhone = String(saved.phone || '').replace(/\D/g, '');
          if (
            callingCode &&
            nationalPhone.startsWith(callingCode) &&
            nationalPhone.length > callingCode.length
          ) {
            nationalPhone = nationalPhone.slice(callingCode.length);
          }

          setProfile({
            ...saved,
            age: saved.age || ageFromStoredBirthDate(saved.dateOfBirth),
            countryCallingCode: callingCode,
            phone: nationalPhone
          });
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [user.email, user.name])
  );

  const updateField = (field, value) => {
    setProfile(current => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors(current => ({ ...current, [field]: undefined }));
    }
  };

  const useImage = result => {
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateField('profileImage', result.assets[0].uri);
    }
  };

  const chooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo-library access to choose a profile image.');
      return;
    }
    useImage(await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    }));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a profile image.');
      return;
    }
    useImage(await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    }));
  };

  const selectPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a photo source.', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: chooseFromGallery },
      ...(profile.profileImage
        ? [{ text: 'Remove Photo', style: 'destructive', onPress: () => updateField('profileImage', '') }]
        : []),
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const openSelector = (field, title, options) => {
    setSelector({ field, title, options });
  };

  const validate = () => {
    const nextErrors = {};
    const cleanName = profile.name.trim();
    const cleanEmail = profile.email.trim().toLowerCase();
    const age = Number(profile.age);
    const phoneValidation = buildInternationalPhone(
      profile.phone,
      profile.countryCallingCode
    );

    if (!validPersonName(cleanName) || !cleanName.includes(' ')) {
      nextErrors.name = 'Enter your full name using letters only.';
    }
    if (!emailPattern.test(cleanEmail)) {
      nextErrors.email = 'Enter a valid email, for example name@example.com.';
    }
    if (!profile.countryIso) {
      nextErrors.country = 'Select your country.';
    }
    if (
      !phoneValidation.valid
    ) {
      nextErrors.phone = 'Use 10–15 digits, optionally beginning with + and country code.';
    }
    if (!/^\d{2,3}$/.test(profile.age) || age < 13 || age > 120) {
      nextErrors.age = 'Enter an age between 13 and 120.';
    }
    if (!GENDER_OPTIONS.includes(profile.gender)) {
      nextErrors.gender = 'Select a gender option.';
    }
    if (!profile.city || !cityOptions.some(city => city.value === profile.city)) {
      nextErrors.city = 'Select a city from the list.';
    }
    if (!OCCUPATION_OPTIONS.includes(profile.occupation)) {
      nextErrors.occupation = 'Select your occupation status.';
    }
    if (
      profile.occupation === 'Other' &&
      profile.occupationOther.trim().length < 2
    ) {
      nextErrors.occupationOther = 'Describe your occupation.';
    }

    const hasEmergencyData = Boolean(
      profile.emergencyName ||
      profile.emergencyPhone ||
      profile.emergencyRelation
    );
    if (hasEmergencyData) {
      if (!validPersonName(profile.emergencyName.trim())) {
        nextErrors.emergencyName = 'Enter a valid emergency contact name.';
      }
      if (!RELATIONSHIP_OPTIONS.includes(profile.emergencyRelation)) {
        nextErrors.emergencyRelation = 'Select the contact relationship.';
      }
      if (!validateInternationalPhone(profile.emergencyPhone).valid) {
        nextErrors.emergencyPhone = 'Enter a valid emergency phone number.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Check your details', 'Please correct the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        ...profile,
        dateOfBirth: undefined,
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: buildInternationalPhone(
          profile.phone,
          profile.countryCallingCode
        ).formatted,
        city: profile.city.trim(),
        occupation: profile.occupation.trim(),
        emergencyName: profile.emergencyName.trim(),
        emergencyPhone: profile.emergencyPhone
          ? validateInternationalPhone(profile.emergencyPhone).formatted
          : ''
      });
      Alert.alert('Profile Updated', 'Your verified profile details were saved.', [
        { text: 'Done', onPress: () => navigation.goBack() }
      ]);
    } catch {
      Alert.alert('Save failed', 'Your profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <>
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
          <Text style={styles.headerTitle}>{t.profile}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatar} onPress={selectPhoto}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile.name?.[0]?.toUpperCase() || 'U'}
              </Text>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.changePhotoBtn} onPress={selectPhoto}>
            <Text style={styles.changePhotoText}>
              {profile.profileImage ? 'Change Photo' : 'Add Profile Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <SectionTitle title="Personal Information" />
          <Field
            label="Full Name *"
            value={profile.name}
            error={errors.name}
            onChangeText={value => updateField('name', value)}
            autoCapitalize="words"
          />
          <Field
            label="Email *"
            value={profile.email}
            error={errors.email}
            onChangeText={value => updateField('email', value.replace(/\s/g, ''))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <DropdownField
            label="Country *"
            value={profile.country}
            placeholder="Select country"
            error={errors.country}
            onPress={() => openSelector('country', 'Select Country', countryOptions)}
          />
          <Text style={styles.label}>Phone Number *</Text>
          <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
            <TouchableOpacity
              style={styles.callingCodeBox}
              onPress={() => openSelector('country', 'Select Country', countryOptions)}
            >
              <Text style={styles.callingCodeText}>
                {profile.countryCallingCode
                  ? `+${profile.countryCallingCode}`
                  : 'Select'}
              </Text>
              <Text style={styles.codeArrow}>⌄</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              value={profile.phone}
              placeholder={profile.countryIso ? 'National phone number' : 'Select country first'}
              placeholderTextColor="#aaa"
              onChangeText={value => updateField('phone', formatPhone(value))}
              keyboardType="phone-pad"
              maxLength={14}
              editable={Boolean(profile.countryIso)}
            />
          </View>
          {!profile.countryIso && (
            <TouchableOpacity
              style={styles.selectCountryHint}
              onPress={() => openSelector('country', 'Select Country', countryOptions)}
            >
              <Text style={styles.selectCountryHintText}>
                Tap to select country and calling code
              </Text>
            </TouchableOpacity>
          )}
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Field
            label="Age *"
            value={profile.age}
            error={errors.age}
            placeholder="Enter your age"
            onChangeText={value => updateField('age', value.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            maxLength={3}
          />

          <DropdownField
            label="Gender / Identity *"
            value={profile.gender}
            placeholder="Select an option"
            error={errors.gender}
            onPress={() => openSelector('gender', 'Gender / Identity', GENDER_OPTIONS)}
          />

          <DropdownField
            label="City *"
            value={profile.city}
            placeholder={profile.countryIso ? 'Select city' : 'Select country first'}
            error={errors.city}
            onPress={() => {
              if (!profile.countryIso) {
                Alert.alert('Select country first', 'Choose your country before selecting a city.');
                return;
              }
              openSelector('city', 'Select City', cityOptions);
            }}
          />
          <DropdownField
            label="Occupation Status *"
            value={profile.occupation}
            error={errors.occupation}
            placeholder="Select occupation"
            onPress={() => openSelector('occupation', 'Occupation Status', OCCUPATION_OPTIONS)}
          />
          {profile.occupation === 'Other' && (
            <Field
              label="Describe Occupation *"
              value={profile.occupationOther}
              error={errors.occupationOther}
              placeholder="For example: Freelance designer"
              onChangeText={value => updateField('occupationOther', value)}
              autoCapitalize="words"
            />
          )}

          <SectionTitle title="Emergency Contact (Optional)" />
          <Text style={styles.sectionHint}>
            If you add one emergency detail, all three fields become required.
          </Text>
          <Field
            label="Contact Name"
            value={profile.emergencyName}
            error={errors.emergencyName}
            onChangeText={value => updateField('emergencyName', value)}
            autoCapitalize="words"
          />
          <DropdownField
            label="Relationship"
            value={profile.emergencyRelation}
            placeholder="Select relationship"
            error={errors.emergencyRelation}
            onPress={() => openSelector('emergencyRelation', 'Relationship', RELATIONSHIP_OPTIONS)}
          />
          <Field
            label="Contact Phone"
            value={profile.emergencyPhone}
            error={errors.emergencyPhone}
            placeholder="+923001234567"
            onChangeText={value => updateField('emergencyPhone', formatPhone(value))}
            keyboardType="phone-pad"
            maxLength={16}
          />

          <SectionTitle title="Care Preferences" />
          <Text style={styles.label}>Preferred Contact</Text>
          <View style={styles.choiceRow}>
            {['Phone', 'Email', 'Text'].map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.choice, profile.preferredContact === option && styles.choiceActive]}
                onPress={() => updateField('preferredContact', option)}
              >
                <Text style={[styles.choiceText, profile.preferredContact === option && styles.choiceTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            label="Therapy Goals"
            value={profile.therapyGoals}
            onChangeText={value => updateField('therapyGoals', value)}
            placeholder="What would you like support with?"
            multiline
            maxLength={500}
          />
          <Field
            label="Medical Notes"
            value={profile.medicalNotes}
            onChangeText={value => updateField('medicalNotes', value)}
            placeholder="Allergies, medication, or information your care team should know"
            multiline
            maxLength={500}
          />

          <Text style={styles.label}>Preferred Language</Text>
          <TouchableOpacity style={styles.langBtn} onPress={() => navigation.navigate('Language')}>
            <Text style={styles.langBtnText}>🌐 Change Language</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Profile</Text>
            }
          </TouchableOpacity>
        </View>
        <View style={styles.bottomSpace} />
      </ScrollView>

      <OptionModal
        selector={selector}
        onClose={() => setSelector(null)}
        onSelect={(field, option) => {
          const value = typeof option === 'string' ? option : option.value;

          if (field === 'country') {
            setProfile(current => ({
              ...current,
              country: value,
              countryIso: option.isoCode,
              countryCallingCode: String(option.phonecode).replace(/\D/g, ''),
              city: '',
              phone: ''
            }));
            setErrors(current => ({
              ...current,
              country: undefined,
              city: undefined,
              phone: undefined
            }));
          } else {
            updateField(field, value);
            if (field === 'occupation' && value !== 'Other') {
              updateField('occupationOther', '');
            }
          }
          setSelector(null);
        }}
      />
    </>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({ label, error, multiline, ...props }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error && styles.inputError
        ]}
        placeholderTextColor="#aaa"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );
}

function DropdownField({ label, value, placeholder, error, onPress }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectInput, error && styles.inputError]}
        onPress={onPress}
      >
        <Text style={value ? styles.selectValue : styles.placeholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.selectArrow}>⌄</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );
}

function OptionModal({ selector, onClose, onSelect }) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [selector?.field]);

  const filteredOptions = (selector?.options || []).filter(option => {
    const label = typeof option === 'string' ? option : option.label;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <Modal
      visible={Boolean(selector)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{selector?.title}</Text>
          {(selector?.options?.length || 0) > 8 && (
            <TextInput
              style={styles.modalSearch}
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor="#aaa"
              autoCorrect={false}
            />
          )}
          <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
            {filteredOptions.map(option => {
              const label = typeof option === 'string' ? option : option.label;
              const key = typeof option === 'string'
                ? option
                : `${option.isoCode || ''}-${option.value}`;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.optionRow}
                  onPress={() => onSelect(selector.field, option)}
                >
                  <Text style={styles.optionText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            {!filteredOptions.length && (
              <Text style={styles.noOptions}>No matching options found.</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#6C63FF' },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarText: { fontSize: 40, fontWeight: '700', color: '#fff' },
  cameraBadge: { position: 'absolute', right: 0, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  cameraBadgeText: { fontSize: 16 },
  changePhotoBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  changePhotoText: { color: '#fff', fontWeight: '600' },
  form: { padding: 20 },
  sectionTitle: { color: '#6C63FF', fontSize: 17, fontWeight: '800', marginTop: 18, marginBottom: 2 },
  sectionHint: { color: '#777', fontSize: 11, lineHeight: 16, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#333', backgroundColor: '#fff' },
  inputError: { borderColor: '#E53935', backgroundColor: '#FFF8F8' },
  phoneRow: { minHeight: 49, flexDirection: 'row', borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' },
  callingCodeBox: { minWidth: 84, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EFFF', borderRightWidth: 1, borderRightColor: '#ddd' },
  callingCodeText: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },
  codeArrow: { color: '#6C63FF', fontSize: 14, marginLeft: 4 },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333' },
  selectCountryHint: { paddingVertical: 8 },
  selectCountryHintText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  multilineInput: { minHeight: 100, paddingTop: 13 },
  errorText: { color: '#E53935', fontSize: 11, lineHeight: 15, marginTop: 5 },
  helperText: { color: '#777', fontSize: 11, marginTop: 5 },
  selectInput: { minHeight: 49, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { color: '#333', fontSize: 15 },
  placeholder: { color: '#aaa', fontSize: 15 },
  selectArrow: { color: '#6C63FF', fontSize: 20 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  choiceActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  choiceText: { color: '#666', fontWeight: '600', fontSize: 13 },
  choiceTextActive: { color: '#fff' },
  langBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#6C63FF', borderRadius: 12, padding: 14, alignItems: 'center' },
  langBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 15 },
  saveBtn: { backgroundColor: '#6C63FF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 26 },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSpace: { height: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  modalSearch: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#333', marginBottom: 8 },
  optionList: { maxHeight: 360 },
  optionRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { color: '#333', fontSize: 15, fontWeight: '500' },
  noOptions: { color: '#888', textAlign: 'center', paddingVertical: 24 },
  modalCancel: { marginTop: 12, paddingVertical: 11, alignItems: 'center' },
  modalCancelText: { color: '#6C63FF', fontWeight: '700' }
});
