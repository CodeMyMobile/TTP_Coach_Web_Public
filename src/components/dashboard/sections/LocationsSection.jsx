import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, RefreshCw, Search } from 'lucide-react';

const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

const loadGooglePlacesScript = (apiKey) => {
  if (!apiKey) {
    return Promise.reject(new Error('Google Places API key is missing.'));
  }

  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-places="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Places API.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googlePlaces = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Places API.'));
    document.head.appendChild(script);
  });
};

const LocationsSection = ({
  locationAction,
  locationsLoading,
  locationsError,
  normalizedLocations,
  onDeleteLocation,
  onRefreshLocations,
  onAddPlaceLocation
}) => {
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState(null);
  const [placesReady, setPlacesReady] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [addingPlaceId, setAddingPlaceId] = useState(null);

  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const placesServiceNodeRef = useRef(null);

  useEffect(() => {
    let active = true;

    loadGooglePlacesScript(googleApiKey)
      .then(() => {
        if (!active || !window.google?.maps?.places) {
          return;
        }

        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceNodeRef.current = document.createElement('div');
        placesServiceRef.current = new window.google.maps.places.PlacesService(placesServiceNodeRef.current);
        setPlacesReady(true);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setSearchError(error instanceof Error ? error.message : 'Failed to initialize location search.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!placesReady) {
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setPredictions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: trimmedQuery,
          types: ['establishment', 'geocode']
        },
        (results, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !Array.isArray(results)) {
            setPredictions([]);
            return;
          }

          setPredictions(
            results.map((item) => ({
              placeId: item.place_id,
              name: item.structured_formatting?.main_text || item.description,
              address: item.structured_formatting?.secondary_text || item.description
            }))
          );
        }
      );
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [placesReady, query]);

  const hasPredictions = useMemo(() => predictions.length > 0 && query.trim().length >= 2, [predictions.length, query]);

  const handleAddPrediction = (placeId) => {
    if (!placeId || !placesServiceRef.current) {
      return;
    }

    setAddingPlaceId(placeId);
    setSearchError(null);

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry']
      },
      async (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.place_id) {
          setAddingPlaceId(null);
          setSearchError('Unable to fetch selected place details. Please try again.');
          return;
        }

        const latitude = place?.geometry?.location?.lat ? Number(place.geometry.location.lat()) : null;
        const longitude = place?.geometry?.location?.lng ? Number(place.geometry.location.lng()) : null;

        const result = await onAddPlaceLocation({
          name: place.name || '',
          address: place.formatted_address || '',
          latitude,
          longitude
        });

        if (result?.ok) {
          setQuery('');
          setPredictions([]);
        }

        setAddingPlaceId(null);
      }
    );
  };

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
            <p className="text-sm text-gray-500">Courts and facilities where you teach</p>
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

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-base font-semibold text-gray-900">Add a Location</h3>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for courts, parks, or clubs..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {hasPredictions && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                {predictions.map((prediction) => (
                  <div
                    key={prediction.placeId}
                    className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{prediction.name}</p>
                      <p className="truncate text-xs text-gray-500">{prediction.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPrediction(prediction.placeId)}
                      disabled={addingPlaceId === prediction.placeId}
                      className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingPlaceId === prediction.placeId ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}
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

          {!locationsLoading && !locationsError && normalizedLocations.length > 0 && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">My Locations</h3>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  {normalizedLocations.length}
                </span>
              </div>
              {normalizedLocations.map((location) => (
                <div
                  key={location.relationId ?? location.placeId ?? `${location.name}-${location.address}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{location.name || 'Location'}</p>
                      <p className="truncate text-xs text-gray-500">{location.address || 'Address unavailable'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteLocation(location.relationId ?? location.placeId)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
