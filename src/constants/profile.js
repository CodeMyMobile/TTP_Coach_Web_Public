export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const createEmptySchedule = (factory = () => []) =>
  DAYS_OF_WEEK.reduce((accumulator, day) => {
    const value = factory(day);
    accumulator[day] = value !== undefined ? value : [];
    return accumulator;
  }, {});

export const createDefaultProfile = () => ({
  id: null,
  profileImage: '',
  profileImageFile: null,
  name: '',
  email: '',
  phone: '',
  bio: '',
  experience_years: '',
  certifications: '',
  home_courts: [],
  levels: [],
  specialties: [],
  formats: [],
  price_private: 100,
  price_semi: 75,
  price_group: 50,
  packages: [],
  languages: [],
  otherLanguage: '',
  availability: createEmptySchedule(() => []),
  availabilityLocations: createEmptySchedule(() => ({})),
  groupClasses: []
});

export default {
  DAYS_OF_WEEK,
  createDefaultProfile
};
