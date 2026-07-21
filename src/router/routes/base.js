// Base / reference data: departures, meal types, countries, products, hotels,
// destinations, parent-destinations, announcements, messages, sent emails,
// quickbooks sync, notifications, and static offers.
const DeparturesIndex = () => import('../../pages/Base/Departures/Index.vue');
const DeparturesOverview = () => import('../../pages/Base/Departures/Overview.vue');
const MealTypesIndex = () => import('../../pages/Base/MealTypes/Index.vue');
const MealTypesManage = () => import('../../pages/Base/MealTypes/Manage.vue');
const CountriesIndex = () => import('../../pages/Base/Countries/Index.vue');
const CountriesManage = () => import('../../pages/Base/Countries/Manage.vue');
const SentEmailsIndex = () => import('../../pages/Base/SentEmails/Index.vue');
const SentEmailsShow = () => import('../../pages/Base/SentEmails/Show.vue');
const QuickBooksSyncIndex = () => import('../../pages/QuickBooksSync/Index.vue');
const QuickBooksSyncShow = () => import('../../pages/QuickBooksSync/Show.vue');
const ProductsIndex = () => import('../../pages/Base/Products/Index.vue');
const ProductsManage = () => import('../../pages/Base/Products/Manage.vue');
const HotelsIndex = () => import('../../pages/Base/Hotels/Index.vue');
const HotelsManage = () => import('../../pages/Base/Hotels/Manage.vue');
const DestinationsIndex = () => import('../../pages/Base/Destinations/Index.vue');
const DestinationsManage = () => import('../../pages/Base/Destinations/Manage.vue');
const DestinationsMerge = () => import('../../pages/Base/Destinations/Merge.vue');
const DestinationsParent = () => import('../../pages/Base/Destinations/Parent.vue');
const ParentDestinationsIndex = () => import('../../pages/Base/ParentDestinations/Index.vue');
const ParentDestinationsManage = () => import('../../pages/Base/ParentDestinations/Manage.vue');
const ParentDestinationsChildren = () => import('../../pages/Base/ParentDestinations/ChildDestinations.vue');
const AnnouncementsIndex = () => import('../../pages/Base/Announcements/Index.vue');
const AnnouncementsManage = () => import('../../pages/Base/Announcements/Manage.vue');
const AnnouncementsNew = () => import('../../pages/Base/Announcements/New.vue');
const AnnouncementsStatistics = () => import('../../pages/Base/Announcements/Statistics.vue');
const MessagesIndex = () => import('../../pages/Base/Messages/Index.vue');
const MessagesCreate = () => import('../../pages/Base/Messages/Create.vue');
const MessagesShow = () => import('../../pages/Base/Messages/Show.vue');
const StaticOffersIndex = () => import('../../pages/StaticOffers/Index.vue');
const StaticOffersManage = () => import('../../pages/StaticOffers/Manage.vue');
const StaticOffersShow = () => import('../../pages/StaticOffers/Show.vue');

export default [
    { path: '/departures', name: 'departures.list', component: DeparturesIndex },
    { path: '/departures/overview', name: 'departures.overview', component: DeparturesOverview },
    { path: '/meal-types', name: 'mealTypes.list', component: MealTypesIndex },
    { path: '/meal-types/create', name: 'mealTypes.create', component: MealTypesManage },
    { path: '/meal-types/:id/edit', name: 'mealTypes.edit', component: MealTypesManage },
    { path: '/countries', name: 'countries.list', component: CountriesIndex },
    { path: '/countries/:id/edit', name: 'countries.edit', component: CountriesManage },
    { path: '/products', name: 'products.list', component: ProductsIndex },
    { path: '/products/create', name: 'products.create', component: ProductsManage },
    { path: '/products/:id/edit', name: 'products.edit', component: ProductsManage },
    { path: '/hotels', name: 'hotels.list', component: HotelsIndex },
    { path: '/hotels/create', name: 'hotels.create', component: HotelsManage },
    { path: '/hotels/:id/edit', name: 'hotels.edit', component: HotelsManage },
    { path: '/destinations', name: 'destinations.list', component: DestinationsIndex },
    { path: '/destinations/create', name: 'destinations.create', component: DestinationsManage },
    { path: '/destinations/merge', name: 'destinations.merge', component: DestinationsMerge },
    { path: '/destinations/parent', name: 'destinations.parent', component: DestinationsParent },
    { path: '/destinations/:id/edit', name: 'destinations.edit', component: DestinationsManage },
    { path: '/parent-destinations', name: 'parentDestinations.list', component: ParentDestinationsIndex },
    { path: '/parent-destinations/create', name: 'parentDestinations.create', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/edit', name: 'parentDestinations.edit', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/destinations', name: 'parentDestinations.children', component: ParentDestinationsChildren },
    { path: '/announcements', name: 'announcements.list', component: AnnouncementsIndex },
    { path: '/announcements/create', name: 'announcements.create', component: AnnouncementsManage },
    { path: '/announcements/new', name: 'announcements.new', component: AnnouncementsNew },
    { path: '/announcements/:id/edit', name: 'announcements.edit', component: AnnouncementsManage },
    { path: '/announcements/:id/statistics', name: 'announcements.statistics', component: AnnouncementsStatistics },
    { path: '/messages', name: 'messages.list', component: MessagesIndex },
    { path: '/messages/create', name: 'messages.create', component: MessagesCreate },
    { path: '/messages/:id', name: 'messages.show', component: MessagesShow },
    { path: '/offers', name: 'staticOffers.list', component: StaticOffersIndex },
    { path: '/offers/create', name: 'staticOffers.create', component: StaticOffersManage },
    { path: '/offers/:id/edit', name: 'staticOffers.edit', component: StaticOffersManage },
    { path: '/offers/:id', name: 'staticOffers.show', component: StaticOffersShow },
    { path: '/sent-emails', name: 'sentEmails.list', component: SentEmailsIndex },
    { path: '/sent-emails/:id', name: 'sentEmails.show', component: SentEmailsShow },
    { path: '/quickbooks/sync', name: 'quickBooksSync.list', component: QuickBooksSyncIndex },
    { path: '/quickbooks/sync/:id', name: 'quickBooksSync.show', component: QuickBooksSyncShow },
];
