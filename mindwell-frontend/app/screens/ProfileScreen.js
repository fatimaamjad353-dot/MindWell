// app/screens/ProfileScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image,
  ActivityIndicator, Modal, Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { City, Country } from 'country-state-city';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../utils/apiService';

const EMPTY_PROFILE = {
  name: '', email: '', phone_no: '', age: '', gender: '',
  country: '', countryIso: '', city: '', occupation: '',
  therapyGoals: '', medicalNotes: '', preferredContact: 'Phone',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  profileImage: ''
};

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Guardian', 'Other'];
const OCCUPATION_OPTIONS = [
  'Student', 'Employed', 'Self-employed', 'Healthcare professional',
  'Educator', 'Homemaker', 'Unemployed', 'Retired', 'Other'
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const validPersonName = v => /^[A-Za-z\u0600-\u06FF' -]{2,60}$/.test(v);
const formatPhone = v => v.replace(/\D/g, '').slice(0, 14);

// ─── Option Modal Component ───────────────────────────────────
function OptionModal({ selector, onClose, onSelect }) {
  const [search, setSearch] = useState('');

  useEffect(() => { setSearch(''); }, [selector?.field]);

  const filtered = (selector?.options || []).filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
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
            />
          )}
          <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
            {filtered.map((opt, i) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              return (
                <TouchableOpacity
                  key={`${label}-${i}`}
                  style={styles.optionRow}
                  onPress={() => onSelect(selector.field, opt)}
                >
                  <Text style={styles.optionText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            {!filtered.length && (
              <Text style={styles.noOptions}>No options found.</Text>
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

// ─── Helper Components ────────────────────────────────────────
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

function DropdownField({ label, value, placeholder, onPress }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectInput} onPress={onPress}>
        <Text style={value ? styles.selectValue : styles.placeholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.selectArrow}>⌄</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ProfileScreen({ navigation, route }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selector, setSelector] = useState(null);

  const countryOptions = useMemo(() =>
    Country.getAllCountries()
      .map(c => ({
        label: `${c.flag || ''} ${c.name} (+${c.phonecode})`.trim(),
        value: c.name,
        isoCode: c.isoCode,
        phonecode: c.phonecode
      }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    []
  );

  const cityOptions = useMemo(() =>
    profile.countryIso
      ? City.getCitiesOfCountry(profile.countryIso)
          .map(c => ({ label: c.name, value: c.name }))
          .filter((c, i, arr) => arr.findIndex(x => x.value === c.value) === i)
          .sort((a, b) => a.value.localeCompare(b.value))
      : [],
    [profile.countryIso]
  );

  // ✅ Load profile from real DB
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        try {
          const result = await request({ path: '/patient/profile' });
          if (active && result?.data) {
            const p = result.data;
            setProfile({
              name: p.name || '',
              email: p.email || '',
              phone_no: p.phone_no || '',
              age: p.age ? String(p.age) : '',
              gender: p.gender || '',
              country: p.country || '',
              countryIso: p.countryIso || '',
              city: p.city || '',
              occupation: p.occupation || '',
              therapyGoals: p.therapyGoals || '',
              medicalNotes: p.medicalNotes || '',
              preferredContact: p.preferredContact || 'Phone',
              emergencyName: p.emergencyName || '',
              emergencyPhone: p.emergencyPhone || '',
              emergencyRelation: p.emergencyRelation || '',
              profileImage: p.profileImage || '',
            });
          }
        } catch (error) {
          console.error('Load profile error:', error.message);
          // Fallback to stored user data
          try {
            const stored = await AsyncStorage.getItem('mindwell_user');
            if (stored && active) {
              const user = JSON.parse(stored);
              setProfile(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
              }));
            }
          } catch {}
        } finally {
          if (active) setLoading(false);
        }
      };
      loadProfile();
      return () => { active = false; };
    }, [])
  );

  const updateField = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleImage = result => {
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateField('profileImage', result.assets[0].uri);
    }
  };

  const chooseFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access.');
      return;
    }
    handleImage(await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8
    }));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access.');
      return;
    }
    handleImage(await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8
    }));
  };

  const selectPhoto = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: chooseFromGallery },
      ...(profile.profileImage
        ? [{ text: 'Remove Photo', style: 'destructive', onPress: () => updateField('profileImage', '') }]
        : []),
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const validate = () => {
    const errs = {};
    if (!profile.name.trim() || !validPersonName(profile.name.trim())) {
      errs.name = 'Enter your full name (letters only).';
    }
    if (!emailPattern.test(profile.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ✅ Save profile to real DB
  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Check your details', 'Please correct the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const result = await request({
        path: '/patient/profile',
        method: 'PUT',
        body: {
          name: profile.name.trim(),
          phone_no: profile.phone_no,
          age: profile.age ? parseInt(profile.age) : null,
          gender: profile.gender,
          country: profile.country,
          countryIso: profile.countryIso,
          city: profile.city,
          occupation: profile.occupation,
          therapyGoals: profile.therapyGoals,
          medicalNotes: profile.medicalNotes,
          preferredContact: profile.preferredContact,
          emergencyName: profile.emergencyName,
          emergencyPhone: profile.emergencyPhone,
          emergencyRelation: profile.emergencyRelation,
          profileImage: profile.profileImage,
        }
      });

      // ✅ Update stored user name if changed
      if (result?.data?.name) {
        const stored = await AsyncStorage.getItem('mindwell_user');
        if (stored) {
          const user = JSON.parse(stored);
          user.name = result.data.name;
          await AsyncStorage.setItem('mindwell_user', JSON.stringify(user));
        }
      }

      Alert.alert(
        '✅ Profile Updated',
        'Your profile has been saved successfully.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.profile || 'My Profile'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Avatar */}
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
          {/* Personal Info */}
          <SectionTitle title="Personal Information" />
          <Field
            label="Full Name *"
            value={profile.name}
            error={errors.name}
            onChangeText={v => updateField('name', v)}
            autoCapitalize="words"
          />
          <Field
            label="Email *"
            value={profile.email}
            error={errors.email}
            onChangeText={v => updateField('email', v.replace(/\s/g, ''))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone Number"
            value={profile.phone_no}
            onChangeText={v => updateField('phone_no', formatPhone(v))}
            keyboardType="phone-pad"
            placeholder="e.g. 03001234567"
          />
          <Field
            label="Age"
            value={profile.age}
            onChangeText={v => updateField('age', v.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            placeholder="Your age"
            maxLength={3}
          />
          <DropdownField
            label="Gender"
            value={profile.gender}
            placeholder="Select gender"
            onPress={() => setSelector({ field: 'gender', title: 'Gender', options: GENDER_OPTIONS })}
          />

          {/* Location */}
          <SectionTitle title="Location" />
          <DropdownField
            label="Country"
            value={profile.country}
            placeholder="Select country"
            onPress={() => setSelector({ field: 'country', title: 'Select Country', options: countryOptions })}
          />
          <DropdownField
            label="City"
            value={profile.city}
            placeholder={profile.countryIso ? 'Select city' : 'Select country first'}
            onPress={() => {
              if (!profile.countryIso) {
                Alert.alert('Select country first', 'Choose your country before selecting a city.');
                return;
              }
              setSelector({ field: 'city', title: 'Select City', options: cityOptions });
            }}
          />

          {/* Professional */}
          <SectionTitle title="Professional" />
          <DropdownField
            label="Occupation"
            value={profile.occupation}
            placeholder="Select occupation"
            onPress={() => setSelector({ field: 'occupation', title: 'Occupation', options: OCCUPATION_OPTIONS })}
          />

          {/* Care Preferences */}
          <SectionTitle title="Care Preferences" />
          <Text style={styles.label}>Preferred Contact</Text>
          <View style={styles.choiceRow}>
            {['Phone', 'Email', 'Text'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.choice, profile.preferredContact === opt && styles.choiceActive]}
                onPress={() => updateField('preferredContact', opt)}
              >
                <Text style={[
                  styles.choiceText,
                  profile.preferredContact === opt && styles.choiceTextActive
                ]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field
            label="Therapy Goals"
            value={profile.therapyGoals}
            onChangeText={v => updateField('therapyGoals', v)}
            placeholder="What would you like support with?"
            multiline
            maxLength={500}
          />
          <Field
            label="Medical Notes"
            value={profile.medicalNotes}
            onChangeText={v => updateField('medicalNotes', v)}
            placeholder="Allergies, medications, or other notes"
            multiline
            maxLength={500}
          />

          {/* Emergency Contact */}
          <SectionTitle title="Emergency Contact (Optional)" />
          <Field
            label="Contact Name"
            value={profile.emergencyName}
            onChangeText={v => updateField('emergencyName', v)}
            autoCapitalize="words"
          />
          <DropdownField
            label="Relationship"
            value={profile.emergencyRelation}
            placeholder="Select relationship"
            onPress={() => setSelector({
              field: 'emergencyRelation',
              title: 'Relationship',
              options: RELATIONSHIP_OPTIONS
            })}
          />
          <Field
            label="Contact Phone"
            value={profile.emergencyPhone}
            onChangeText={v => updateField('emergencyPhone', formatPhone(v))}
            keyboardType="phone-pad"
            placeholder="+923001234567"
            maxLength={16}
          />

          {/* Language */}
          <SectionTitle title="Preferences" />
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => navigation.navigate('Language')}
          >
            <Text style={styles.langBtnText}>🌐 Change Language</Text>
          </TouchableOpacity>

          {/* Save Button */}
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

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Option Modal */}
      <OptionModal
        selector={selector}
        onClose={() => setSelector(null)}
        onSelect={(field, option) => {
          const value = typeof option === 'string' ? option : option.value;
          if (field === 'country') {
            setProfile(prev => ({
              ...prev,
              country: value,
              countryIso: option.isoCode || '',
              city: '',
            }));
          } else {
            updateField(field, value);
          }
          setSelector(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  loadingScreen: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#F0EFFF'
  },
  loadingText: { color: '#666', marginTop: 12 },
  header: {
    backgroundColor: '#6C63FF', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 50
  },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  avatarSection: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: '#6C63FF'
  },
  avatar: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarText: { fontSize: 40, fontWeight: '700', color: '#fff' },
  cameraBadge: {
    position: 'absolute', right: 0, bottom: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', elevation: 3
  },
  cameraBadgeText: { fontSize: 16 },
  changePhotoBtn: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20
  },
  changePhotoText: { color: '#fff', fontWeight: '600' },
  form: { padding: 20 },
  sectionTitle: {
    color: '#6C63FF', fontSize: 16, fontWeight: '800',
    marginTop: 20, marginBottom: 4,
    borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16
  },
  label: {
    fontSize: 13, fontWeight: '600',
    color: '#333', marginBottom: 6, marginTop: 14
  },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#333', backgroundColor: '#fff'
  },
  inputError: { borderColor: '#E53935', backgroundColor: '#FFF8F8' },
  multilineInput: { minHeight: 100, paddingTop: 13 },
  errorText: { color: '#E53935', fontSize: 11, marginTop: 4 },
  selectInput: {
    minHeight: 49, borderWidth: 1.5, borderColor: '#ddd',
    borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  selectValue: { color: '#333', fontSize: 15 },
  placeholder: { color: '#aaa', fontSize: 15 },
  selectArrow: { color: '#6C63FF', fontSize: 20 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1, alignItems: 'center', paddingVertical: 11,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: '#ddd', backgroundColor: '#fff'
  },
  choiceActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  choiceText: { color: '#666', fontWeight: '600', fontSize: 13 },
  choiceTextActive: { color: '#fff' },
  langBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#6C63FF',
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 14
  },
  langBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    backgroundColor: '#6C63FF', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center', marginTop: 26
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', padding: 24
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  modalTitle: {
    fontSize: 18, fontWeight: '800',
    color: '#1a1a2e', marginBottom: 10
  },
  modalSearch: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#333', marginBottom: 8
  },
  optionList: { maxHeight: 360 },
  optionRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { color: '#333', fontSize: 15, fontWeight: '500' },
  noOptions: { color: '#888', textAlign: 'center', paddingVertical: 24 },
  modalCancel: { marginTop: 12, paddingVertical: 11, alignItems: 'center' },
  modalCancelText: { color: '#6C63FF', fontWeight: '700' },
});