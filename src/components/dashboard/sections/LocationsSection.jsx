import React from 'react';
import { MapPin, RefreshCw } from 'lucide-react';

const LocationsSection = ({
  locationAction,
  locationIdInput,
  onLocationIdChange,
  onAddLocation,
  customLocationForm,
  onCustomLocationChange,
  onAddCustomLocation,
  locationsLoading,
  locationsError,
  normalizedLocations,
  onDeleteLocation,
  onRefreshLocations
}) => (
  <section className="mt-6 space-y-6">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
          <p className="text-sm text-gray-500">Manage courts and teaching locations</p>
        </div>
        <button
          type="button"
          onClick={onRefreshLocations}
          className="inline-flex items-center space-x-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {locationAction && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            locationAction.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {locationAction.message}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-base font-semibold text-gray-900">Add Existing Location</h3>
          <p className="mt-1 text-xs text-gray-500">Use a master location id.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Location ID"
              value={locationIdInput}
              onChange={(event) => onLocationIdChange(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={onAddLocation}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Add
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-base font-semibold text-gray-900">Add Custom Location</h3>
          <p className="mt-1 text-xs text-gray-500">Create and link a new location.</p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Location name"
              value={customLocationForm.location}
              onChange={(event) => onCustomLocationChange({ ...customLocationForm, location: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="Latitude"
                value={customLocationForm.latitude}
                onChange={(event) => onCustomLocationChange({ ...customLocationForm, latitude: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="Longitude"
                value={customLocationForm.longitude}
                onChange={(event) => onCustomLocationChange({ ...customLocationForm, longitude: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={onAddCustomLocation}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              Create Location
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {locationsLoading && (
          <div className="flex flex-col items-center justify-center space-y-2 py-6 text-sm text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
            <span>Loading locations...</span>
          </div>
        )}

        {!locationsLoading && locationsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">We couldn't load your locations.</p>
            <p className="mt-1 text-xs text-red-600">{locationsError}</p>
          </div>
        )}

        {!locationsLoading && !locationsError && normalizedLocations.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No locations linked yet.
          </div>
        )}

        {normalizedLocations.map((location) => (
          <div
            key={location.relationId ?? location.locationId ?? location.label}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {location.label || 'Location'}
                </p>
                <p className="text-xs text-gray-500">
                  Location ID: {location.locationId ?? 'N/A'}
                </p>
                {location.latitude !== undefined && location.longitude !== undefined && (
                  <p className="text-xs text-gray-400">
                    {location.latitude}, {location.longitude}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDeleteLocation(location.relationId ?? location.locationId)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default LocationsSection;
