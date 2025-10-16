          {/* Step 8: Availability - COMPLETE VERSION */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set your availability</h2>
              <p className="text-gray-600 text-sm mb-6">Add your regular teaching hours and group classes</p>

              {/* Tab Selection */}
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setAvailabilityTab('private')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    availabilityTab === 'private' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Private Lesson Slots
                </button>
                <button
                  onClick={() => setAvailabilityTab('group')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    availabilityTab === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Regular Group Classes
                </button>
              </div>

              {/* Private Slots Tab */}
              {availabilityTab === 'private' && (
                <div>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {Object.keys(formData.availability).map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                          selectedDay === day
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                        {formData.availability[day].length > 0 && (
                          <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                            {formData.availability[day].length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{selectedDay} Private Slots</h3>
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={newTimeSlot.start}
                          onChange={(e) => setNewTimeSlot({...newTimeSlot, start: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={newTimeSlot.end}
                          onChange={(e) => setNewTimeSlot({...newTimeSlot, end: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={addTimeSlot}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {formData.availability[selectedDay].length > 0 ? (
                        formData.availability[selectedDay].map((slot, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                            <span className="text-sm text-gray-700">
                              <Clock className="w-3 h-3 inline mr-2 text-gray-400" />
                              {slot}
                            </span>
                            <button
                              onClick={() => removeTimeSlot(selectedDay, index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No private slots set for {selectedDay}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Group Classes Tab */}
              {availabilityTab === 'group' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Regular Weekly Group Classes</h3>
                    <button
                      onClick={addGroupClass}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Class</span>
                    </button>
                  </div>

                  {formData.groupClasses.length > 0 ? (
                    <div className="space-y-4">
                      {formData.groupClasses.map((cls, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Group Class {index + 1}</h4>
                            <button
                              onClick={() => removeGroupClass(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Class Name *
                              </label>
                              <input
                                type="text"
                                value={cls.name}
                                onChange={(e) => updateGroupClass(index, 'name', e.target.value)}
                                placeholder="e.g., Intermediate Cardio Tennis"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Class Description
                              </label>
                              <textarea
                                value={cls.description}
                                onChange={(e) => updateGroupClass(index, 'description', e.target.value)}
                                placeholder="Describe what students will learn..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Day of Week
                              </label>
                              <select
                                value={cls.day}
                                onChange={(e) => updateGroupClass(index, 'day', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                {Object.keys(formData.availability).map(day => (
                                  <option key={day} value={day}>{day}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={cls.time}
                                onChange={(e) => updateGroupClass(index, 'time', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Duration (minutes)
                              </label>
                              <select
                                value={cls.duration}
                                onChange={(e) => updateGroupClass(index, 'duration', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="60">60 minutes</option>
                                <option value="90">90 minutes</option>
                                <option value="120">2 hours</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Level Required
                              </label>
                              <select
                                value={cls.level}
                                onChange={(e) => updateGroupClass(index, 'level', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">All levels</option>
                                {formData.levels.map(level => (
                                  <option key={level} value={level}>Level {level}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Max Students
                              </label>
                              <input
                                type="number"
                                value={cls.maxStudents}
                                onChange={(e) => updateGroupClass(index, 'maxStudents', parseInt(e.target.value) || 0)}
                                min="2"
                                max="20"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Price per Student ($)
                              </label>
                              <input
                                type="number"
                                value={cls.price}
                                onChange={(e) => updateGroupClass(index, 'price', parseInt(e.target.value) || 0)}
                                min="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Location
                              </label>
                              <select
                                value={cls.court}
                                onChange={(e) => updateGroupClass(index, 'court', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">Select location</option>
                                {formData.home_courts.map(court => (
                                  <option key={court} value={court}>{court}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No group classes scheduled</p>
                      <p className="text-gray-400 text-xs mt-1">Add regular weekly group sessions</p>
                    </div>
                  )}
                </div>
              )}

              {errors.availability && <p className="text-red-500 text-sm mt-2">{errors.availability}</p>}
            </div>
          )}
