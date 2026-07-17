/**
 * The charter-flight providers, mirroring the flights API `FlightProviderEnum`
 * (app/Enums/FlightProviderEnum.php). Kept in sync by hand.
 *
 * Two stable keys per provider:
 *  - `value`: the numeric enum backing value. Used by `travel_options.providers`.
 *  - `slug`:  the durable string key. Used as `destinations.provider_identifiers` keys.
 */
export const FLIGHT_PROVIDERS = [
    { value: 1, slug: 'fly_tik', name: 'Fly Tik' },
    { value: 2, slug: 'air_prishtina', name: 'Air Prishtina' },
    { value: 3, slug: 'malesia_reisen', name: 'Malesia Reisen' },
    { value: 4, slug: 'eri_fly', name: 'Eri Fly' },
    { value: 5, slug: 'illyrian_eagle', name: 'Illyrian Eagle' },
    { value: 6, slug: 'kosova_fly', name: 'Kosova Fly' },
    { value: 7, slug: 'raci_travel', name: 'Raci Travel' },
    { value: 8, slug: 'fly_prishtina', name: 'Fly Prishtina' },
];

/** Human label for a numeric provider value (travel_options.providers). */
export function flightProviderName(value) {
    return FLIGHT_PROVIDERS.find((provider) => provider.value === value)?.name ?? value;
}

/** Human label for a provider slug (provider_identifiers keys). */
export function flightProviderNameBySlug(slug) {
    return FLIGHT_PROVIDERS.find((provider) => provider.slug === slug)?.name ?? slug;
}
