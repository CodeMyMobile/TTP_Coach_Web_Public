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
