import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Autocomplete from 'react-google-autocomplete';
import {
  Award,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Globe,
  Info,
  MapPin,
  Menu,
  Plus,
  Save,
  Target,
  Trash2,
  Trophy,
  User,
  Users
} from 'lucide-react';
import { DAYS_OF_WEEK, createDefaultProfile } from '../../constants/profile';
import { createStripeOnboardingLink, refreshStripeOnboardingLink } from '../../api/CoachApi/payments';
import { getCoachProfile } from '../../api/CoachApi/profileScreen';
import { requestCoachAvatarUploadUrl, uploadCoachAvatar } from '../../api/CoachApi/onboarding';

const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

const createInitialState = () => createDefaultProfile();

const stepsConfig = [
  { title: 'Basic Info', icon: <User className="h-4 w-4" /> },
  { title: 'Courts', icon: <MapPin className="h-4 w-4" /> },
  { title: 'Levels', icon: <Trophy className="h-4 w-4" /> },
  { title: 'Specialties', icon: <Target className="h-4 w-4" /> },
  { title: 'Formats', icon: <Users className="h-4 w-4" /> },
  { title: 'Pricing', icon: <DollarSign className="h-4 w-4" /> },
  { title: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
  { title: 'Languages', icon: <Globe className="h-4 w-4" /> },
  { title: 'Availability', icon: <Calendar className="h-4 w-4" /> },
  { title: 'Review', icon: <Eye className="h-4 w-4" /> }
];

const OnboardingFlow = ({ initialData, onComplete, isMobile, initialStep = 0, onRefreshProfile }) => {
  const [formData, setFormData] = useState(() => ({ ...createInitialState(), ...(initialData || {}) }));
  const [currentStep, setCurrentStep] = useState(initialStep || 0);
  const [errors, setErrors] = useState({});
  const [locationInput, setLocationInput] = useState('');
  const [stripeStatus, setStripeStatus] = useState('not_connected');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [stripeReturnUrl, setStripeReturnUrl] = useState('');
  const stripeWindowRef = useRef(null);
  const stripeWatchRef = useRef(null);
  const [availabilityTab, setAvailabilityTab] = useState('private');
  const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[0]);
  const [newTimeSlot, setNewTimeSlot] = useState({ start: '09:00', end: '10:00', location: '' });
  const [showStepsMenu, setShowStepsMenu] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(
    () => (initialData?.profileImage && typeof initialData.profileImage === 'string' ? initialData.profileImage : '')
  );
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const uploadObjectUrlRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const baseState = createInitialState();
      setFormData({
        ...baseState,
        ...initialData,
        profileImage: initialData.profileImage || baseState.profileImage,
        profileImageFile: initialData.profileImageFile || baseState.profileImageFile,
        availability: {
          ...baseState.availability,
          ...(initialData.availability || {})
        },
        availabilityLocations: {
          ...baseState.availabilityLocations,
          ...(initialData.availabilityLocations || {})
        }
      });
      if (initialData.profileImage && typeof initialData.profileImage === 'string') {
        setProfileImagePreview(initialData.profileImage);
      } else {
        setProfileImagePreview('');
      }
    }
  }, [initialData]);

  useEffect(() => {
    setCurrentStep(initialStep || 0);
  }, [initialStep]);

  useEffect(() => {
    return () => {
      if (uploadObjectUrlRef.current) {
        URL.revokeObjectURL(uploadObjectUrlRef.current);
        uploadObjectUrlRef.current = null;
      }
      if (stripeWatchRef.current) {
        clearInterval(stripeWatchRef.current);
        stripeWatchRef.current = null;
      }
    };
  }, []);

  const deriveStripeStatus = useCallback(() => {
    if (formData?.charges_enabled) {
      return 'verified';
    }
    if (formData?.stripe_account_id) {
      return 'pending';
    }
    return 'not_connected';
  }, [formData?.charges_enabled, formData?.stripe_account_id]);

  useEffect(() => {
    setStripeStatus(deriveStripeStatus());
  }, [deriveStripeStatus]);

  const progress = useMemo(() => ((currentStep + 1) / stepsConfig.length) * 100, [currentStep]);

  const clearProfileImageError = useCallback(() => {
    setErrors((previousErrors) => {
      if (!previousErrors.profileImage) {
        return previousErrors;
      }
      const { profileImage, ...rest } = previousErrors;
      return rest;
    });
  }, []);

  const updateProfileImage = useCallback(
    async (file) => {
      if (!file) {
        setFormData((previous) => ({ ...previous, profileImage: '', profileImageFile: null }));
        if (uploadObjectUrlRef.current) {
          URL.revokeObjectURL(uploadObjectUrlRef.current);
          uploadObjectUrlRef.current = null;
        }
        setProfileImagePreview('');
        clearProfileImageError();
        return;
      }

      if (!(file instanceof File) || !file.type?.startsWith('image/')) {
        setErrors((previous) => ({
          ...previous,
          profileImage: 'Please choose a valid image file'
        }));
        return;
      }

      const contentType = file.type || 'image/jpeg';
      const extensionFromType = contentType.split('/')?.[1] || '';
      const extensionFromName = typeof file.name === 'string' ? file.name.split('.').pop() || '' : '';
      const resolvedExtension =
        (extensionFromType || extensionFromName).toLowerCase() === 'jpg'
          ? 'jpeg'
          : (extensionFromType || extensionFromName).toLowerCase();

      if (!resolvedExtension) {
        setErrors((previous) => ({
          ...previous,
          profileImage: 'Unable to determine image type'
        }));
        return;
      }

      try {
        clearProfileImageError();
        setProfileImageUploading(true);

        const presignResponse = await requestCoachAvatarUploadUrl(resolvedExtension);
        if (!presignResponse || !presignResponse.ok) {
          let message = 'Unable to start profile photo upload.';
          try {
            const body = await presignResponse.json();
            message = body?.detail || body?.message || body?.error || message;
          } catch (parseError) {
            // ignore parse issues
          }
          throw new Error(message);
        }

        const presignData = await presignResponse.json().catch(() => null);
        const uploadUrl =
          presignData?.uploadURL ||
          presignData?.uploadUrl ||
          presignData?.url ||
          presignData?.signedUrl ||
          presignData?.signedURL;

        if (!uploadUrl) {
          throw new Error('Upload URL not provided by server.');
        }

        const uploadResponse = await uploadCoachAvatar(uploadUrl, file, contentType);
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload profile photo to storage.');
        }

        const fileKey =
          presignData?.fileKey ||
          presignData?.file_key ||
          presignData?.key ||
          presignData?.s3Key ||
          presignData?.s3_key ||
          '';
        const fileUrl =
          presignData?.fileUrl ||
          presignData?.file_url ||
          presignData?.cdnUrl ||
          presignData?.cdn_url ||
          presignData?.publicUrl ||
          presignData?.public_url ||
          '';

        setFormData((previous) => ({
          ...previous,
          profileImage: fileKey || fileUrl || previous.profileImage || '',
          profileImageFile: null
        }));

        if (uploadObjectUrlRef.current) {
          URL.revokeObjectURL(uploadObjectUrlRef.current);
          uploadObjectUrlRef.current = null;
        }

        if (fileUrl) {
          setProfileImagePreview(fileUrl);
        } else if (typeof window !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
          const objectUrl = URL.createObjectURL(file);
          uploadObjectUrlRef.current = objectUrl;
          setProfileImagePreview(objectUrl);
        } else {
          setProfileImagePreview('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload profile photo.';
        setErrors((previous) => ({
          ...previous,
          profileImage: message
        }));
      } finally {
        setProfileImageUploading(false);
      }
    },
    [clearProfileImageError]
  );

  const handleProfileImageInputChange = async (event) => {
    if (profileImageUploading) {
      if (event.target) {
        event.target.value = '';
      }
      return;
    }
    const file = event.target.files?.[0];
    await updateProfileImage(file);
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleProfileImageDrop = async (event) => {
    event.preventDefault();
    setIsDraggingImage(false);
    if (profileImageUploading) {
      if (event.dataTransfer) {
        event.dataTransfer.clearData();
      }
      return;
    }
    const file = event.dataTransfer?.files?.[0];
    await updateProfileImage(file);
    if (event.dataTransfer) {
      event.dataTransfer.clearData();
    }
  };

  const handleProfileImageDragOver = (event) => {
    event.preventDefault();
    if (!isDraggingImage && !profileImageUploading) {
      setIsDraggingImage(true);
    }
  };

  const handleProfileImageDragLeave = (event) => {
    event.preventDefault();
    setIsDraggingImage(false);
  };

  const handleRemoveProfileImage = () => {
    if (uploadObjectUrlRef.current) {
      URL.revokeObjectURL(uploadObjectUrlRef.current);
      uploadObjectUrlRef.current = null;
    }
    setProfileImagePreview('');
    setFormData((previous) => ({ ...previous, profileImage: '', profileImageFile: null }));
    clearProfileImageError();
  };

  const validateStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 0: {
        if (!formData.profileImage && !profileImagePreview) newErrors.profileImage = 'Profile image is required';
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.bio.trim()) newErrors.bio = 'Bio is required';
        if (formData.bio.trim() && formData.bio.length < 100) newErrors.bio = 'Bio should be at least 100 characters';
        if (!formData.experience_years) newErrors.experience_years = 'Years of experience is required';
        break;
      }
      case 1: {
        if (formData.home_courts.length === 0) newErrors.home_courts = 'Add at least one teaching location';
        break;
      }
      case 2: {
        if (formData.levels.length === 0) newErrors.levels = 'Select at least one level';
        break;
      }
      case 8: {
        const hasAvailability = Object.values(formData.availability).some((slots) => slots.length > 0);
        const hasGroupClasses = formData.groupClasses.length > 0;
        if (!hasAvailability && !hasGroupClasses) {
          newErrors.availability = 'Add at least one availability slot or group class';
        }
        break;
      }
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep() && currentStep < stepsConfig.length - 1) {
      setCurrentStep((step) => step + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep() || !onComplete) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      const result = await onComplete(formData);

      if (result?.error) {
        const message =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || 'Failed to submit profile';
        setSubmissionError(message);
        return;
      }

      setCurrentStep(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit profile';
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.home_courts.includes(locationInput)) {
      setFormData({ ...formData, home_courts: [...formData.home_courts, locationInput.trim()] });
      setLocationInput('');
    }
  };

  const removeLocation = (index) => {
    setFormData({
      ...formData,
      home_courts: formData.home_courts.filter((_, i) => i !== index)
    });
  };

  const refreshStripeProfile = useCallback(async () => {
    try {
      const response = await getCoachProfile();
      if (!response?.ok) {
        return;
      }
      const payload = await response.json().catch(() => null);
      setFormData((prev) => ({
        ...prev,
        stripe_account_id: payload?.stripe_account_id ?? prev.stripe_account_id,
        charges_enabled: payload?.charges_enabled ?? prev.charges_enabled,
        charges_disabled_reason: payload?.charges_disabled_reason ?? prev.charges_disabled_reason
      }));
    } catch {
      // ignore errors, onboarding state will refresh on next load
    }
  }, []);

  const openStripeOnboardingWindow = useCallback((payload = {}) => {
    const redirectUrl = (payload.redirect_url || payload.url || payload.onboarding_url || '').trim();
    const returnUrl = (payload.return_url || '').trim();

    if (returnUrl) {
      setStripeReturnUrl(returnUrl);
    }

    if (redirectUrl && typeof window !== 'undefined') {
      const stripeWindow = window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      stripeWindowRef.current = stripeWindow || null;

      if (stripeWatchRef.current) {
        clearInterval(stripeWatchRef.current);
        stripeWatchRef.current = null;
      }

      stripeWatchRef.current = window.setInterval(() => {
        if (!stripeWindowRef.current || stripeWindowRef.current.closed) {
          stripeWindowRef.current = null;
          if (stripeWatchRef.current) {
            clearInterval(stripeWatchRef.current);
            stripeWatchRef.current = null;
          }
          if (typeof onRefreshProfile === 'function') {
            onRefreshProfile();
          }
          refreshStripeProfile();
        }
      }, 1000);
    }
  }, [onRefreshProfile, refreshStripeProfile]);

  useEffect(() => {
    refreshStripeProfile();
  }, [refreshStripeProfile]);

  const initiateStripeOnboarding = useCallback(async () => {
    setStripeError(null);
    setStripeLoading(true);
    try {
      const response = await createStripeOnboardingLink();
      if (!response) {
        throw new Error('Failed to start Stripe onboarding.');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.message || data?.error || 'Failed to start Stripe onboarding.';
        throw new Error(message);
      }

      openStripeOnboardingWindow(data || {});
      setStripeStatus('pending');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start Stripe onboarding.';
      setStripeError(message);
      setStripeStatus('not_connected');
    } finally {
      setStripeLoading(false);
    }
  }, [openStripeOnboardingWindow]);

  const handleStripeRefresh = useCallback(async () => {
    setStripeError(null);
    setStripeLoading(true);
    try {
      const response = await refreshStripeOnboardingLink();
      if (!response) {
        throw new Error('Unable to refresh Stripe onboarding.');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.message || data?.error || 'Unable to refresh Stripe onboarding.';
        throw new Error(message);
      }

      openStripeOnboardingWindow(data || {});
      setStripeStatus((previous) => (previous === 'not_connected' ? 'pending' : previous));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh Stripe onboarding.';
      setStripeError(message);
    } finally {
      setStripeLoading(false);
    }
  }, [openStripeOnboardingWindow]);

  const addTimeSlot = () => {
    const daySlots = formData.availability[selectedDay] || [];
    const dayLocations = formData.availabilityLocations[selectedDay] || {};
    const slotLabel = `${newTimeSlot.start} - ${newTimeSlot.end}`;

    if (!daySlots.includes(slotLabel) && newTimeSlot.location) {
      setFormData({
        ...formData,
        availability: {
          ...formData.availability,
          [selectedDay]: [...daySlots, slotLabel]
        },
        availabilityLocations: {
          ...formData.availabilityLocations,
          [selectedDay]: { ...dayLocations, [slotLabel]: newTimeSlot.location }
        }
      });
      setNewTimeSlot({ start: '09:00', end: '10:00', location: '' });
    }
  };

  const removeTimeSlot = (day, index) => {
    const slots = [...formData.availability[day]];
    const removedSlot = slots[index];
    slots.splice(index, 1);

    const locations = { ...formData.availabilityLocations[day] };
    delete locations[removedSlot];

    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: slots
      },
      availabilityLocations: {
        ...formData.availabilityLocations,
        [day]: locations
      }
    });
  };

  const addGroupClass = () => {
    const newClass = {
      name: '',
      description: '',
      day: 'Monday',
      time: '18:00',
      duration: 90,
      levels: [],
      maxStudents: 8,
      court: formData.home_courts[0] || '',
      price: 30
    };

    setFormData({ ...formData, groupClasses: [...formData.groupClasses, newClass] });
  };

  const updateGroupClass = (index, field, value) => {
    const updated = [...formData.groupClasses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, groupClasses: updated });
  };

  const removeGroupClass = (index) => {
    setFormData({
      ...formData,
      groupClasses: formData.groupClasses.filter((_, i) => i !== index)
    });
  };

  const levelOptions = [
    { value: 'beginner', label: 'Beginner', color: 'bg-green-100 text-green-700' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-700' },
    { value: 'advanced', label: 'Advanced', color: 'bg-purple-100 text-purple-700' },
    { value: 'competitive', label: 'Competitive', color: 'bg-orange-100 text-orange-700' }
  ];

  const specialtyOptions = [
    { value: 'serve', label: 'Serve', icon: '🎯' },
    { value: 'forehand', label: 'Forehand', icon: '💪' },
    { value: 'backhand', label: 'Backhand', icon: '🎾' },
    { value: 'volley', label: 'Volley', icon: '🏐' },
    { value: 'footwork', label: 'Footwork', icon: '👟' },
    { value: 'strategy', label: 'Strategy', icon: '♟️' },
    { value: 'doubles', label: 'Doubles', icon: '👥' },
    { value: 'mental', label: 'Mental Game', icon: '🧠' },
    { value: 'fitness', label: 'Fitness', icon: '💪' },
    { value: 'juniors', label: 'Juniors', icon: '👶' }
  ];

  const formatOptions = [
    { value: 'private', label: 'Private Lessons', desc: 'One-on-one focused training' },
    { value: 'semi', label: 'Semi-Private', desc: '2-3 students sharing a lesson' },
    { value: 'group', label: 'Group Classes', desc: '4+ students in a class setting' },
    { value: 'clinics', label: 'Clinics', desc: 'Specialized workshops' },
    { value: 'hitting', label: 'Hitting Partner', desc: 'Rally and practice partner' }
  ];

  const languageOptions = useMemo(
    () => [
      { value: 'en', label: 'English', flag: '🇺🇸' },
      { value: 'es', label: 'Spanish', flag: '🇪🇸' },
      { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
      { value: 'fr', label: 'French', flag: '🇫🇷' },
      { value: 'de', label: 'German', flag: '🇩🇪' },
      { value: 'it', label: 'Italian', flag: '🇮🇹' },
      { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
      { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
      { value: 'ko', label: 'Korean', flag: '🇰🇷' }
    ],
    []
  );

  const languageSummary = useMemo(() => {
    const selected = formData.languages
      .map((language) => languageOptions.find((option) => option.value === language)?.label || language)
      .filter(Boolean);

    if (formData.otherLanguage?.trim()) {
      selected.push(
        ...formData.otherLanguage
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
    }

    return selected;
  }, [formData.languages, formData.otherLanguage, languageOptions]);

  const resolvedProfileImageSrc =
    profileImagePreview ||
    (typeof formData.profileImage === 'string' && formData.profileImage ? formData.profileImage : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:flex-nowrap">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <span className="text-sm font-bold text-white">TP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Tennis Plan</h1>
              <p className="text-xs text-gray-600 sm:text-sm">Coach Portal</p>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setShowStepsMenu((open) => !open)}
              className="rounded-lg p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {showStepsMenu && isMobile && (
        <div className="border-b bg-white shadow-lg">
          <div className="max-h-64 space-y-1 overflow-y-auto px-4 py-2">
            {stepsConfig.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  if (index < currentStep || validateStep()) {
                    setCurrentStep(index);
                    setShowStepsMenu(false);
                  }
                }}
                className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left text-sm ${
                  index === currentStep
                    ? 'bg-green-50 text-green-600'
                    : index < currentStep
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'cursor-not-allowed text-gray-400'
                }`}
                disabled={index > currentStep}
              >
                {index < currentStep ? <Check className="h-4 w-4 text-green-500" /> : step.icon}
                <span className="font-medium">{step.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <div className="mb-4 space-y-4 rounded-2xl bg-white p-4 shadow-lg sm:p-6">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Profile Completion</p>
                <h2 className="text-xl font-bold text-gray-900">{stepsConfig[currentStep].title}</h2>
              </div>
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep + 1} of {stepsConfig.length}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {stepsConfig.map((step, index) => (
              <div
                key={step.title}
                className={`flex flex-col items-center rounded-xl border px-3 py-2 text-xs ${
                  index < currentStep
                    ? 'border-green-200 bg-green-50 text-green-600'
                    : index === currentStep
                      ? 'border-green-300 bg-white text-green-600 shadow-sm'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                      ? 'bg-green-500 text-white ring-4 ring-green-100'
                      : 'bg-gray-200 text-gray-500'
                }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : step.icon}
                </div>
                <span className={`mt-1 hidden text-xs sm:block ${
                  index === currentStep ? 'font-medium text-gray-900' : 'text-gray-500'
                }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 rounded-2xl bg-white p-4 shadow-lg sm:p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Start with the basics</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="profileImageInput">
                    Profile Photo *
                  </label>
                  <div
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
                      errors.profileImage
                        ? 'border-red-300 bg-red-50'
                        : isDraggingImage
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50 hover:border-green-400'
                    }`}
                    onDragOver={handleProfileImageDragOver}
                    onDragEnter={handleProfileImageDragOver}
                    onDragLeave={handleProfileImageDragLeave}
                    onDrop={handleProfileImageDrop}
                  >
                    {resolvedProfileImageSrc ? (
                      <>
                        <img
                          src={resolvedProfileImageSrc}
                          alt="Profile preview"
                          className="mb-4 h-24 w-24 rounded-full border border-white object-cover shadow-md"
                        />
                        <p className="text-sm text-gray-600">
                          {profileImageUploading
                            ? 'Uploading new photo…'
                            : 'Click or drop a new image to replace your current photo.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleRemoveProfileImage}
                          disabled={profileImageUploading}
                          className={`mt-3 inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium transition ${
                            profileImageUploading
                              ? 'cursor-not-allowed text-gray-400'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Remove photo
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-gray-400 shadow-inner">
                          <User className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Drag &amp; drop or click to upload</p>
                        <p className="mt-1 text-xs text-gray-500">Recommended: square image, at least 400x400 pixels.</p>
                      </>
                    )}
                    <input
                      id="profileImageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageInputChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      disabled={profileImageUploading}
                    />
                    {profileImageUploading && !resolvedProfileImageSrc && (
                      <div className="mt-3 text-sm text-gray-500">Uploading photo…</div>
                    )}
                  </div>
                  {errors.profileImage && <p className="mt-1 text-xs text-red-500">{errors.profileImage}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John Smith"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="coach@email.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Years of Experience *</label>
                  <select
                    value={formData.experience_years}
                    onChange={(event) => setFormData({ ...formData, experience_years: event.target.value })}
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.experience_years ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select years</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="11-15">11-15 years</option>
                    <option value="16+">16+ years</option>
                  </select>
                  {errors.experience_years && <p className="mt-1 text-xs text-red-500">{errors.experience_years}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Professional Certifications</label>
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { value: 'USPTA', label: 'USPTA' },
                      { value: 'USPTA Elite', label: 'USPTA Elite' },
                      { value: 'PTR', label: 'PTR' },
                      { value: 'PTR Master', label: 'PTR Master' },
                      { value: 'USTA High Performance', label: 'USTA HP' },
                      { value: 'ITF Level 1', label: 'ITF Level 1' },
                      { value: 'ITF Level 2', label: 'ITF Level 2' },
                      { value: 'ITF Level 3', label: 'ITF Level 3' },
                      { value: 'RSPA', label: 'RSPA' }
                    ].map((cert) => (
                      <label
                        key={cert.value}
                        className="flex items-center space-x-2 rounded-lg border p-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={formData.certifications.split(', ').includes(cert.value)}
                          onChange={(event) => {
                            const current = formData.certifications ? formData.certifications.split(', ') : [];
                            if (event.target.checked) {
                              if (!current.includes(cert.value)) {
                                current.push(cert.value);
                              }
                            } else {
                              const index = current.indexOf(cert.value);
                              if (index !== -1) {
                                current.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, certifications: current.filter(Boolean).join(', ') });
                          }}
                          className="rounded text-green-500 focus:ring-green-500"
                        />
                        <span className="text-xs sm:text-sm">{cert.label}</span>
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formData.certifications}
                    onChange={(event) => setFormData({ ...formData, certifications: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add other certifications or edit..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Check common certifications or type additional ones
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Bio * <span className="text-xs text-gray-500">({formData.bio.length}/400)</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    className={`h-32 w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.bio ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Tell potential students about your experience, teaching philosophy, and what makes your lessons special..."
                    maxLength={400}
                  />
                  {errors.bio && <p className="mt-1 text-xs text-red-500">{errors.bio}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    <Info className="mr-1 inline h-3 w-3" />
                    This bio will be analyzed by AI to match you with compatible students
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Where do you teach?</h2>
              <p className="text-sm text-gray-600">Add all locations where you regularly teach</p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Autocomplete
                  apiKey={googleApiKey}
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && addLocation()}
                  onPlaceSelected={(place) => {
                    const address = place?.formatted_address || place?.name || '';
                    if (address) {
                      setLocationInput(address);
                    }
                  }}
                  options={{ types: ['establishment', 'geocode'] }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter tennis court or location..."
                  defaultValue=""
                />
                <button
                  type="button"
                  onClick={addLocation}
                  className="rounded-lg bg-green-500 px-4 py-3 text-white transition hover:bg-green-600"
                >
                  Add
                </button>
              </div>
              {errors.home_courts && <p className="text-xs text-red-500">{errors.home_courts}</p>}
              <div className="space-y-2">
                {formData.home_courts.map((court, index) => (
                  <div
                    key={court}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700"
                  >
                    <span className="break-words">{court}</span>
                    <button
                      type="button"
                      onClick={() => removeLocation(index)}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {formData.home_courts.length === 0 && (
                  <p className="text-sm text-gray-500">No locations added yet</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Which student levels do you teach?</h2>
              <p className="text-sm text-gray-600">Select all skill levels you are comfortable coaching</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                {levelOptions.map((level) => (
                  <label
                    key={level.value}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                      formData.levels.includes(level.value)
                        ? `${level.color} border-transparent`
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span>{level.label}</span>
                    <input
                      type="checkbox"
                      checked={formData.levels.includes(level.value)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setFormData({ ...formData, levels: [...formData.levels, level.value] });
                        } else {
                          setFormData({
                            ...formData,
                            levels: formData.levels.filter((item) => item !== level.value)
                          });
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500"
                    />
                  </label>
                ))}
              </div>
              {errors.levels && <p className="text-xs text-red-500">{errors.levels}</p>}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">What are your specialties?</h2>
              <p className="text-sm text-gray-600">Select areas where you excel in teaching</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {specialtyOptions.map((specialty) => (
                  <label
                    key={specialty.value}
                    className="flex cursor-pointer items-center space-x-2 rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.specialties.includes(specialty.value)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setFormData({
                            ...formData,
                            specialties: [...formData.specialties, specialty.value]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            specialties: formData.specialties.filter((item) => item !== specialty.value)
                          });
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500"
                    />
                    <span className="text-xl">{specialty.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{specialty.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">What formats do you offer?</h2>
              <p className="text-sm text-gray-600">Select all lesson formats you provide</p>
              <div className="space-y-3">
                {formatOptions.map((format) => (
                  <label
                    key={format.value}
                    className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.formats.includes(format.value)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setFormData({ ...formData, formats: [...formData.formats, format.value] });
                        } else {
                          setFormData({
                            ...formData,
                            formats: formData.formats.filter((item) => item !== format.value)
                          });
                        }
                      }}
                      className="mt-1 rounded text-green-500 focus:ring-green-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{format.label}</span>
                      <p className="mt-0.5 text-xs text-gray-500">{format.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Set your pricing</h2>
              <p className="text-sm text-gray-600">Enter your hourly rates for different formats</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Private Lessons (per hour)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.price_private}
                      onChange={(event) =>
                        setFormData({ ...formData, price_private: parseInt(event.target.value, 10) || 0 })
                      }
                      className="w-full rounded-lg border border-gray-300 px-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="40"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Recommended: $80-150/hour</p>
                </div>

                {formData.formats.includes('semi') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Semi-Private (per student)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.price_semi}
                        onChange={(event) =>
                          setFormData({ ...formData, price_semi: parseInt(event.target.value, 10) || 0 })
                        }
                        className="w-full rounded-lg border border-gray-300 px-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="30"
                      />
                    </div>
                  </div>
                )}

                {formData.formats.includes('group') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Group Classes (per student)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.price_group}
                        onChange={(event) =>
                          setFormData({ ...formData, price_group: parseInt(event.target.value, 10) || 0 })
                        }
                        className="w-full rounded-lg border border-gray-300 px-8 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="20"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Set up payments</h2>
              <p className="text-sm text-gray-600">Connect with Stripe to receive payments directly from students</p>
              {stripeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {stripeError}
                </div>
              )}
              {stripeStatus === 'not_connected' && (
                <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
                  <h3 className="mb-2 font-semibold text-gray-900">Secure payments with Stripe</h3>
                  <ul className="mb-4 space-y-2 text-sm text-gray-700">
                    <li>✓ Direct deposits to your bank account</li>
                    <li>✓ Automatic payouts (daily, weekly, or monthly)</li>
                    <li>✓ Industry-standard 2.9% + $0.30 processing fee</li>
                    <li>✓ PCI compliant and bank-level security</li>
                  </ul>
                  <button
                    type="button"
                    onClick={initiateStripeOnboarding}
                    disabled={stripeLoading}
                    className="rounded-lg bg-purple-600 px-6 py-3 text-white transition hover:bg-purple-700"
                  >
                    {stripeLoading ? 'Connecting…' : 'Connect with Stripe →'}
                  </button>
                </div>
              )}
              {stripeStatus === 'pending' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
                    {stripeLoading
                      ? 'Opening Stripe—complete the verification in the new tab.'
                      : 'Stripe is still finishing your verification. If you recently submitted your details, click below to resume or check again.'}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStripeRefresh}
                      disabled={stripeLoading}
                      className="rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {stripeLoading ? 'Opening Stripe…' : 'Resume Stripe setup'}
                    </button>
                    {stripeReturnUrl && (
                      <span className="text-xs text-gray-500">
                        Once Stripe redirects you back to{' '}
                        <span className="font-medium text-gray-600">{stripeReturnUrl}</span>, refresh this page to continue.
                      </span>
                    )}
                  </div>
                </div>
              )}
              {stripeStatus === 'verified' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm text-green-700">
                  Stripe account connected successfully!
                </div>
              )}
              {stripeLoading && stripeStatus === 'not_connected' && (
                <div className="text-sm text-gray-500">Preparing Stripe onboarding…</div>
              )}
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Which languages do you speak?</h2>
              <p className="text-sm text-gray-600">Help students find coaches they can communicate with</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {languageOptions.map((language) => (
                  <label
                    key={language.value}
                    className="flex cursor-pointer items-center space-x-2 rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(language.value)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setFormData({ ...formData, languages: [...formData.languages, language.value] });
                        } else {
                          setFormData({
                            ...formData,
                            languages: formData.languages.filter((item) => item !== language.value)
                          });
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500"
                    />
                    <span className="text-xl">{language.flag}</span>
                    <span className="text-sm font-medium text-gray-700">{language.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="otherLanguage">
                  Other languages
                </label>
                <input
                  id="otherLanguage"
                  type="text"
                  value={formData.otherLanguage}
                  onChange={(event) => setFormData({ ...formData, otherLanguage: event.target.value })}
                  placeholder="Add any additional languages"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                <p className="text-xs text-gray-500">Use commas to separate multiple languages.</p>
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Set your availability</h2>
              <p className="text-sm text-gray-600">Add your regular teaching hours and group classes</p>
              <div className="flex space-x-2 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setAvailabilityTab('private')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    availabilityTab === 'private' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Private Lesson Slots
                </button>
                <button
                  type="button"
                  onClick={() => setAvailabilityTab('group')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                    availabilityTab === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Regular Group Classes
                </button>
              </div>

              {availabilityTab === 'private' && (
                <div>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium ${
                          selectedDay === day
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                        {formData.availability[day].length > 0 && (
                          <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                            {formData.availability[day].length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-medium text-gray-900">{selectedDay} Private Slots</h3>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                        <input
                          type="time"
                          value={newTimeSlot.start}
                          onChange={(event) => setNewTimeSlot({ ...newTimeSlot, start: event.target.value })}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm sm:w-auto"
                        />
                        <span className="text-center text-gray-500 sm:inline sm:text-left">to</span>
                        <input
                          type="time"
                          value={newTimeSlot.end}
                          onChange={(event) => setNewTimeSlot({ ...newTimeSlot, end: event.target.value })}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm sm:w-auto"
                        />
                      </div>
                      <select
                        value={newTimeSlot.location}
                        onChange={(event) => setNewTimeSlot({ ...newTimeSlot, location: event.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm sm:w-auto"
                      >
                        <option value="">Select court</option>
                        {formData.home_courts.map((court) => (
                          <option key={court} value={court}>
                            {court}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addTimeSlot}
                        className="w-full rounded bg-green-500 px-3 py-2 text-sm text-white hover:bg-green-600 sm:w-auto sm:py-1"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {formData.availability[selectedDay].length > 0 ? (
                      formData.availability[selectedDay].map((slot, index) => (
                        <div
                          key={`${slot}-${index}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded bg-white p-2"
                        >
                          <div>
                              <span className="text-sm text-gray-700">{slot}</span>
                              {formData.availabilityLocations[selectedDay]?.[slot] && (
                                <span className="block text-xs text-gray-500">
                                  at {formData.availabilityLocations[selectedDay][slot]}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(selectedDay, index)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-center text-sm text-gray-500">
                          No private slots set for {selectedDay}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {availabilityTab === 'group' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-medium text-gray-900">Regular Weekly Group Classes</h3>
                    <button
                      type="button"
                      onClick={addGroupClass}
                      className="flex items-center space-x-1 text-sm font-medium text-green-600 hover:text-green-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Class</span>
                    </button>
                  </div>

                  {formData.groupClasses.length > 0 ? (
                    <div className="space-y-4">
                      {formData.groupClasses.map((groupClass, index) => (
                        <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Class Name</label>
                              <input
                                type="text"
                                value={groupClass.name}
                                onChange={(event) => updateGroupClass(index, 'name', event.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., Junior High Performance"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Day</label>
                              <select
                                value={groupClass.day}
                                onChange={(event) => updateGroupClass(index, 'day', event.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                {DAYS_OF_WEEK.map((day) => (
                                  <option key={day} value={day}>
                                    {day}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Time</label>
                              <input
                                type="time"
                                value={groupClass.time}
                                onChange={(event) => updateGroupClass(index, 'time', event.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Duration (minutes)</label>
                              <input
                                type="number"
                                value={groupClass.duration}
                                onChange={(event) => updateGroupClass(index, 'duration', parseInt(event.target.value, 10) || 0)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Court</label>
                              <select
                                value={groupClass.court}
                                onChange={(event) => updateGroupClass(index, 'court', event.target.value)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="">Select court</option>
                                {formData.home_courts.map((court) => (
                                  <option key={court} value={court}>
                                    {court}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Price per student</label>
                              <input
                                type="number"
                                value={groupClass.price}
                                onChange={(event) => updateGroupClass(index, 'price', parseInt(event.target.value, 10) || 0)}
                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGroupClass(index)}
                            className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remove Class</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                      No group classes added yet
                    </div>
                  )}
                </div>
              )}

              {errors.availability && <p className="text-xs text-red-500">{errors.availability}</p>}
            </div>
          )}

          {currentStep === 9 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Review your profile</h2>
              <p className="text-sm text-gray-600">Make sure everything looks good before submitting</p>
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-gray-900">
                    <User className="h-4 w-4" />
                    <span>Basic Information</span>
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                        {formData.profileImage ? (
                          <img src={formData.profileImage} alt="Selected profile" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-500">
                            No photo
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Profile Photo</p>
                        <p className="text-sm text-gray-700">
                          {formData.profileImage ? 'Ready to upload' : 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <p>
                      <strong>Name:</strong> {formData.name || 'Not provided'}
                    </p>
                    <p>
                      <strong>Email:</strong> <span className="break-all">{formData.email || 'Not provided'}</span>
                    </p>
                    {formData.phone && (
                      <p>
                        <strong>Phone:</strong> {formData.phone}
                      </p>
                    )}
                    <p>
                      <strong>Experience:</strong> {formData.experience_years || 'Not provided'}
                    </p>
                    {formData.certifications && (
                      <p>
                        <strong>Certifications:</strong> {formData.certifications}
                      </p>
                    )}
                    <p className="mt-2">
                      <strong>Bio:</strong> {formData.bio || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-gray-900">
                    <MapPin className="h-4 w-4" />
                    <span>Locations & Availability</span>
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <strong>Locations:</strong> {formData.home_courts.length > 0 ? formData.home_courts.join(', ') : 'None added'}
                    </p>
                    <p>
                      <strong>Private Slots:</strong> {Object.values(formData.availability).flat().length} total
                    </p>
                    {formData.groupClasses.length > 0 && (
                      <p>
                        <strong>Group Classes:</strong> {formData.groupClasses.length} weekly classes
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 flex items-center space-x-2 text-sm font-semibold text-gray-900">
                    <Award className="h-4 w-4" />
                    <span>Coaching Details</span>
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <strong>Levels:</strong> {formData.levels.length > 0 ? formData.levels.join(', ') : 'None selected'}
                    </p>
                    <p>
                      <strong>Specialties:</strong> {formData.specialties.length > 0 ? formData.specialties.join(', ') : 'None selected'}
                    </p>
                    <p>
                      <strong>Formats:</strong> {formData.formats.length > 0 ? formData.formats.join(', ') : 'None selected'}
                    </p>
                    <p>
                      <strong>Pricing:</strong>
                    </p>
                    <ul className="ml-4 list-disc space-y-1 text-gray-600">
                      <li>Private: ${formData.price_private}/hour</li>
                      {formData.formats.includes('semi') && formData.price_semi && (
                        <li>Semi-Private: ${formData.price_semi}/hour</li>
                      )}
                      {formData.formats.includes('group') && formData.price_group && (
                        <li>Group: ${formData.price_group}/hour</li>
                      )}
                    </ul>
                    <p>
                      <strong>Languages:</strong>{' '}
                      {languageSummary.length > 0 ? languageSummary.join(', ') : 'None selected'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0 || isSubmitting}
            className={`flex w-full items-center justify-center space-x-2 rounded-lg border px-6 py-3 text-sm font-medium transition sm:w-auto ${
              currentStep === 0 || isSubmitting
                ? 'cursor-not-allowed border-gray-200 text-gray-400'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {currentStep < stepsConfig.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:from-green-600 hover:to-emerald-700 sm:w-auto"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:from-green-600 hover:to-emerald-700 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Submit'}</span>
            </button>
          )}
        </div>

        {submissionError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {submissionError}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
