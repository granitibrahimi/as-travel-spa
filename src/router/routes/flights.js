// Charter-flights domain: destinations + travel-options management and search.
const FlightDestinationsIndex = () => import('../../pages/Flights/Destinations/Index.vue');
const FlightDestinationsManage = () => import('../../pages/Flights/Destinations/Manage.vue');
const TravelOptionsIndex = () => import('../../pages/Flights/TravelOptions/Index.vue');
const TravelOptionsManage = () => import('../../pages/Flights/TravelOptions/Manage.vue');
const FlightSearch = () => import('../../pages/Flights/Search.vue');

export default [
    { path: '/flight-destinations', name: 'flightDestinations.list', component: FlightDestinationsIndex },
    { path: '/flight-destinations/create', name: 'flightDestinations.create', component: FlightDestinationsManage },
    { path: '/flight-destinations/:id/edit', name: 'flightDestinations.edit', component: FlightDestinationsManage },
    { path: '/travel-options', name: 'travelOptions.list', component: TravelOptionsIndex },
    { path: '/travel-options/create', name: 'travelOptions.create', component: TravelOptionsManage },
    { path: '/travel-options/:id/edit', name: 'travelOptions.edit', component: TravelOptionsManage },
    { path: '/flight-search', name: 'flights.search', component: FlightSearch },
];
