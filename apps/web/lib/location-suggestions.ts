import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { getGoogleMapsKey } from './env';
import type { Coordinates } from '@litterbugs/report-contract';
import type { SearchPlace } from './place-geography';

export type LocationSuggestion = {
  id: string;
  label: string;
  subtitle: string;
  resolve: () => Promise<SearchPlace>;
};

export function locationType(types: readonly string[]) {
  if (types.includes('locality') || types.includes('postal_town')) return 'City / town';
  if (types.includes('postal_code')) return 'Postal code';
  if (types.includes('country')) return 'Country';
  if (types.some(type => type.startsWith('administrative_area'))) return 'Region';
  if (types.includes('street_address') || types.includes('premise') || types.includes('route')) return 'Address';
  return 'Place';
}

async function initializeMaps() {
  if (typeof google === 'undefined' || !google.maps?.importLibrary) {
    const key = getGoogleMapsKey();
    if (!key) throw new Error('Location search unavailable');
    setOptions({ key, v: 'weekly', authReferrerPolicy: 'origin' });
  }
}

/** One provider-ranked list and one billing session per picker; resolve only the chosen place. */
export function createLocationSearch() {
  let token: google.maps.places.AutocompleteSessionToken | undefined;
  let useGeocoderFallback = false;
  return {
    reset() { token = undefined; },
    async search(input: string, bias?: Coordinates | null): Promise<LocationSuggestion[]> {
      await initializeMaps();
      if (!useGeocoderFallback) {
        try {
          const { AutocompleteSuggestion, AutocompleteSessionToken } = await importLibrary('places');
          token ??= new AutocompleteSessionToken();
          const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input, sessionToken: token,
            ...(bias && Number.isFinite(bias.latitude) && Number.isFinite(bias.longitude)
              ? { locationBias: { center: { lat: bias.latitude, lng: bias.longitude }, radius: 50000 } } : {}),
          });
          const seen = new Set<string>();
          return suggestions.flatMap(({ placePrediction: prediction }) => {
            if (!prediction || seen.has(prediction.placeId)) return [];
            seen.add(prediction.placeId);
            const label = prediction.text.toString();
            const subtitle = locationType(prediction.types);
            return [{ id: prediction.placeId, label, subtitle, resolve: async () => {
              const place = prediction.toPlace();
              await place.fetchFields({ fields: ['location', 'viewport'] });
              token = undefined;
              if (!place.location) throw new Error('Location unavailable');
              const latitude = place.location.lat(), longitude = place.location.lng();
              return { id: prediction.placeId, label, subtitle, latitude, longitude,
                bounds: place.viewport?.toJSON() ?? { north: latitude + .01, south: latitude - .01, west: longitude - .01, east: longitude + .01 } };
            } }];
          }).slice(0, 5);
        } catch {
          // Existing browser keys may not yet allow Places (New). Keep a single, usable
          // Google result list instead of mixing in alphabetically sorted Census towns.
          useGeocoderFallback = true;
          token = undefined;
        }
      }
      const { Geocoder } = await importLibrary('geocoding');
      try {
        const { results } = await new Geocoder().geocode({ address: input });
        return results.slice(0, 5).map(result => {
          const place: SearchPlace = { id: result.place_id, label: result.formatted_address,
            subtitle: locationType(result.types), latitude: result.geometry.location.lat(),
            longitude: result.geometry.location.lng(), bounds: result.geometry.viewport.toJSON() };
          return { ...place, resolve: async () => place };
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'ZERO_RESULTS') return [];
        throw error;
      }
    },
  };
}
