import React, { useState } from 'react';
import { User, MapPin, Trophy, Target, Users, DollarSign, Globe, Calendar, CreditCard, Eye, ChevronLeft, ChevronRight, Check, Save, X, Plus, Info, Award } from 'lucide-react';

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    home_courts: [],
    levels: [],
    specialties: [],
    formats: [],
    price_private: 100,
    price_semi: 75,
    price_group: 50,
    packages: [],
    languages: [],
    certifications: [],
    experience_years: ''
  });
  const [errors, setErrors] = useState({});
  const [locationInput, setLocationInput] = useState('');
  const [stripeStatus, setStripeStatus] = useState('not_connected');

  const steps = [
    { title: 'Basic Info', icon: <User className="w-4 h-4" /> },
    { title: 'Courts', icon: <MapPin className="w-4 h-4" /> },
    { title: 'Levels', icon: <Trophy className="w-4 h-4" /> },
    { title: 'Specialties', icon: <Target className="w-4 h-4" /> },
    { title: 'Formats', icon: <Users className="w-4 h-4" /> },
    { title: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
    { title: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { title: 'Languages', icon: <Globe className="w-4 h-4" /> },
    { title: 'Availability', icon: <Calendar className="w-4 h-4" /> },
    { title: 'Review', icon: <Eye className="w-4 h-4" /> }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const validateStep = () => {
    const newErrors = {};
    
    switch(currentStep) {
      case 0:
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.bio.trim()) newErrors.bio = 'Bio is required';
        if (formData.bio.trim() && formData.bio.length < 100) newErrors.bio = 'Bio should be at least 100 characters';
        break;
      case 1:
        if (formData.home_courts.length === 0) newErrors.home_courts = 'Add at least one teaching location';
        break;
      case 2:
        if (formData.levels.length === 0) newErrors.levels = 'Select at least one level';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Profile submitted:', formData);
    setIsProfileComplete(true);
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.home_courts.includes(locationInput)) {
      setFormData({...formData, home_courts: [...formData.home_courts, locationInput]});
      setLocationInput('');
    }
  };

  const removeLocation = (index) => {
    const newCourts = formData.home_courts.filter((_, i) => i !== index);
    setFormData({...formData, home_courts: newCourts});
  };

  const initiateStripeOnboarding = () => {
    setStripeStatus('pending');
    setTimeout(() => {
      setStripeStatus('verified');
    }, 2000);
  };

  if (isProfileComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile Complete!</h1>
            <p className="text-gray-600 mb-4">Your coach profile has been submitted successfully.</p>
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="font-semibold text-green-900 mb-2">Profile Summary:</h2>
              <p>Name: {formData.name}</p>
              <p>Email: {formData.email}</p>
              <p>Locations: {formData.home_courts.length}</p>
              <p>Teaching Levels: {formData.levels.length}</p>
            </div>
            <button
              onClick={() => {setIsProfileComplete(false); setCurrentStep(0);}}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">TP</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tennis Plan Coach Portal</h1>
              <p className="text-sm text-gray-600">Complete your profile for AI matching</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between mt-4 px-2">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                index < currentStep ? 'bg-green-500 text-white' :
                index === currentStep ? 'bg-green-500 text-white ring-4 ring-green-100' :
                'bg-gray-200 text-gray-500'
              }`}>
                {index < currentStep ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className={`text-xs mt-1 ${
                index === currentStep ? 'text-gray-900 font-medium' : 'text-gray-500'
              } hidden sm:block`}>{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Let's start with the basics</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Smith"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="coach@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio * <span className="text-gray-500 text-xs">({formData.bio.length}/400)</span>
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-32 ${
                    errors.bio ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Tell potential students about your experience, teaching philosophy, and what makes your lessons special..."
                  maxLength={400}
                />
                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  <Info className="w-3 h-3 inline mr-1" />
                  This bio will be analyzed by AI to match you with compatible students
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                <select
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select experience</option>
                  <option value="1-2">1-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Courts */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Where do you teach?</h2>
              <p className="text-gray-600 text-sm mb-6">Add all locations where you regularly teach</p>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter tennis court or location..."
                />
                <button
                  onClick={addLocation}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {formData.home_courts.map((court, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                    <span className="text-sm text-gray-700">{court}</span>
                    <button
                      onClick={() => removeLocation(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {errors.home_courts && <p className="text-red-500 text-sm mt-2">{errors.home_courts}</p>}
            </div>
          )}

          {/* Step 2: Teaching Levels */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What levels do you teach?</h2>
              <p className="text-gray-600 text-sm mb-6">Select all NTRP levels you're comfortable teaching</p>
              
              <div className="space-y-3">
                {[
                  { value: '2.5', label: '2.5 - Beginner', desc: 'Learning basic strokes and rules' },
                  { value: '3.0', label: '3.0 - Advanced Beginner', desc: 'Can sustain short rallies' },
                  { value: '3.5', label: '3.5 - Intermediate', desc: 'Consistent on medium-paced shots' },
                  { value: '4.0', label: '4.0 - Advanced Intermediate', desc: 'Dependable strokes' },
                  { value: '4.5', label: '4.5 - Advanced', desc: 'Can vary strategies' },
                  { value: '5.0', label: '5.0+ - Expert', desc: 'Tournament level' }
                ].map(level => (
                  <label key={level.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.levels.includes(level.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, levels: [...formData.levels, level.value]});
                        } else {
                          setFormData({...formData, levels: formData.levels.filter(l => l !== level.value)});
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{level.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.levels && <p className="text-red-500 text-sm mt-2">{errors.levels}</p>}
            </div>
          )}

          {/* Step 3: Specialties */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your specialties?</h2>
              <p className="text-gray-600 text-sm mb-6">Select areas where you excel in teaching</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
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
                ].map(specialty => (
                  <label key={specialty.value} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.specialties.includes(specialty.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, specialties: [...formData.specialties, specialty.value]});
                        } else {
                          setFormData({...formData, specialties: formData.specialties.filter(s => s !== specialty.value)});
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

          {/* Step 4: Formats */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What formats do you offer?</h2>
              <p className="text-gray-600 text-sm mb-6">Select all lesson formats you provide</p>
              
              <div className="space-y-3">
                {[
                  { value: 'private', label: 'Private Lessons', desc: 'One-on-one focused training' },
                  { value: 'semi', label: 'Semi-Private', desc: '2-3 students sharing a lesson' },
                  { value: 'group', label: 'Group Classes', desc: '4+ students in a class setting' },
                  { value: 'clinics', label: 'Clinics', desc: 'Specialized workshops' },
                  { value: 'hitting', label: 'Hitting Partner', desc: 'Rally and practice partner' }
                ].map(format => (
                  <label key={format.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.formats.includes(format.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, formats: [...formData.formats, format.value]});
                        } else {
                          setFormData({...formData, formats: formData.formats.filter(f => f !== format.value)});
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{format.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{format.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Pricing */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set your pricing</h2>
              <p className="text-gray-600 text-sm mb-6">Enter your hourly rates for different formats</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Lessons (per hour)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.price_private}
                      onChange={(e) => setFormData({...formData, price_private: parseInt(e.target.value) || 0})}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="40"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: $80-150/hour</p>
                </div>

                {formData.formats.includes('semi') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semi-Private (per hour per student)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.price_semi}
                        onChange={(e) => setFormData({...formData, price_semi: parseInt(e.target.value) || 0})}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="30"
                      />
                    </div>
                  </div>
                )}

                {formData.formats.includes('group') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Classes (per hour per student)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.price_group}
                        onChange={(e) => setFormData({...formData, price_group: parseInt(e.target.value) || 0})}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="20"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Stripe Payments */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up payments</h2>
              <p className="text-gray-600 text-sm">Connect with Stripe to receive payments directly from students</p>

              {stripeStatus === 'not_connected' && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Secure payments with Stripe</h3>
                  <ul className="text-sm text-gray-700 space-y-2 mb-4">
                    <li>✓ Direct deposits to your bank account</li>
                    <li>✓ Automatic payouts (daily, weekly, or monthly)</li>
                    <li>✓ Industry-standard 2.9% + $0.30 processing fee</li>
                    <li>✓ PCI compliant and bank-level security</li>
                  </ul>
                  <button
                    onClick={initiateStripeOnboarding}
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                  >
                    Connect with Stripe →
                  </button>
                </div>
              )}

              {stripeStatus === 'pending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Connecting to Stripe...</h3>
                      <p className="text-sm text-gray-600">Please wait while we set up your payment account</p>
                    </div>
                  </div>
                </div>
              )}

              {stripeStatus === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <Check className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Payment account verified!</h3>
                      <p className="text-sm text-gray-600">Your Stripe account is connected and ready to accept payments</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Languages */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Languages you speak</h2>
              <p className="text-gray-600 text-sm mb-6">Select all languages you can teach in</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'en', label: 'English', flag: '🇺🇸' },
                  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
                  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
                  { value: 'fr', label: 'French', flag: '🇫🇷' },
                  { value: 'de', label: 'German', flag: '🇩🇪' },
                  { value: 'it', label: 'Italian', flag: '🇮🇹' }
                ].map(language => (
                  <label key={language.value} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(language.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, languages: [...formData.languages, language.value]});
                        } else {
                          setFormData({...formData, languages: formData.languages.filter(l => l !== language.value)});
                        }
                      }}
                      className="rounded text-green-500 focus:ring-green-500"
                    />
                    <span className="text-xl">{language.flag}</span>
                    <span className="text-sm font-medium text-gray-700">{language.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}


          {/* Step 9: Review */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review your profile</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Basic Info</h3>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
                  <p><strong>Experience:</strong> {formData.experience_years || 'Not specified'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Teaching Details</h3>
                  <p><strong>Locations:</strong> {formData.home_courts.join(', ') || 'None added'}</p>
                  <p><strong>Levels:</strong> {formData.levels.join(', ') || 'None selected'}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-900">
                  <Check className="w-4 h-4 inline mr-1" />
                  Your profile is ready! Click submit to start receiving student matches.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Submit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
