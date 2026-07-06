/**
 * Workspaces + navigation for the SPA — mirrors the platform's
 * config/workspaces.php. The sidebar is built by filtering these by the
 * current user's permissions (from /me): each item shows when the user holds
 * its `can` permission or any of its `canAny` permissions (admins see all).
 *
 * `to` values are SPA router paths. Some routes are not migrated yet, so their
 * links resolve to the NotFound page until the page exists.
 */
export const workspaces = [
    {
        key: 'crm',
        label: 'CRM',
        can: 'crm.access',
        home: '/',
        groups: [
            {
                label: 'Static Offers',
                items: [
                    { label: 'All Offers', to: '/offers', can: 'staticOffers.list' },
                    { label: 'New Offer', to: '/offers/create', can: 'staticOffers.create' },
                ],
            },
            {
                label: 'Tasks',
                items: [
                    { label: 'All Tasks', to: '/tasks', can: 'tasks.list' },
                    { label: 'Dashboard', to: '/tasks/dashboard', can: 'tasks.dashboard' },
                    { label: 'New Task', to: '/tasks/create', can: 'tasks.create' },
                ],
            },
            {
                label: 'Travelers',
                items: [
                    { label: 'All Travelers', to: '/travelers', can: 'persons.list' },
                    { label: 'New Traveler', to: '/travelers/create', can: 'persons.create' },
                ],
            },
            {
                label: 'Customers',
                items: [
                    { label: 'All Customers', to: '/customers', can: 'customers.list' },
                    { label: 'New Customer', to: '/customers/create', can: 'customers.create' },
                    { label: 'All Invoices', to: '/customers/invoices', canAny: ['customerInvoices.listAll', 'customerInvoices.listOwn'] },
                    { label: 'Due Invoices', to: '/customers/invoices/due', canAny: ['customerInvoices.listAllDue', 'customerInvoices.listOwnDue'] },
                    { label: 'Credit Notes', to: '/customers/credit-notes', canAny: ['customerCreditNotes.listAll', 'customerCreditNotes.listOwn'] },
                ],
            },
            {
                label: 'Departures',
                items: [
                    { label: 'Departure Info', to: '/departures/overview', can: 'departureInfo.overview' },
                    { label: 'All Departures', to: '/departures', can: 'departureInfo.list' },
                ],
            },
            {
                label: 'Destinations',
                items: [
                    { label: 'All Destinations', to: '/destinations', can: 'destinations.list' },
                    { label: 'New Destination', to: '/destinations/create', can: 'destinations.create' },
                    { label: 'Parent Destinations', to: '/parent-destinations', can: 'parentDestinations.list' },
                    { label: 'New Parent Destination', to: '/parent-destinations/create', can: 'parentDestinations.create' },
                ],
            },
            {
                label: 'Hotels',
                items: [
                    { label: 'All Hotels', to: '/hotels', can: 'hotels.list' },
                    { label: 'New Hotel', to: '/hotels/create', can: 'hotels.create' },
                ],
            },
            {
                label: 'Meal Types',
                items: [
                    { label: 'All Meal Types', to: '/meal-types', can: 'mealTypes.list' },
                    { label: 'New Meal Type', to: '/meal-types/create', can: 'mealTypes.create' },
                ],
            },
            {
                label: 'Countries',
                items: [
                    { label: 'All Countries', to: '/countries', can: 'countries.list' },
                ],
            },
            {
                label: 'Online Credentials',
                items: [
                    { label: 'All Credentials', to: '/online-credentials', can: 'onlineSystemCredentials.list' },
                ],
            },
        ],
    },
    {
        key: 'hr',
        label: 'HR',
        can: 'hr.access',
        home: '/',
        groups: [
            {
                label: 'Users',
                items: [
                    { label: 'Users', to: '/users', can: 'users.list' },
                    { label: 'New User', to: '/users/create', can: 'users.create' },
                    { label: 'User Logs', to: '/users/logs', can: 'users.logs' },
                ],
            },
            {
                label: 'Access',
                items: [
                    { label: 'Roles', to: '/roles', can: 'roles.index' },
                    { label: 'Permissions', to: '/permissions', can: 'roles.allPermissions' },
                ],
            },
            {
                label: 'Vacations',
                items: [
                    { label: 'All Requests', to: '/vacations', can: 'vacation.viewAllUsers' },
                    { label: 'Apply for Vacation', to: '/vacations/apply', can: 'vacations.applyForm' },
                    { label: 'Official Holidays', to: '/official-holidays', can: 'officialHolidays.list' },
                    { label: 'Work Schedule', to: '/work-schedule', can: 'workSchedule.index' },
                ],
            },
        ],
    },
    {
        key: 'finance',
        label: 'Finance',
        can: 'finance.access',
        home: '/',
        groups: [
            {
                label: 'Accounts',
                items: [
                    { label: 'All Accounts', to: '/accounts', can: 'accounts.list' },
                    { label: 'Account Types', to: '/accounts/types', can: 'accounts.types' },
                    { label: 'Mapping', to: '/accounts/mapping', can: 'accounts.mapping' },
                ],
            },
            {
                label: 'Customers',
                items: [
                    { label: 'All Customers', to: '/customers', can: 'customers.list' },
                    { label: 'New Customer', to: '/customers/create', can: 'customers.create' },
                    { label: 'All Invoices', to: '/customers/invoices', canAny: ['customerInvoices.listAll', 'customerInvoices.listOwn'] },
                    { label: 'Due Invoices', to: '/customers/invoices/due', canAny: ['customerInvoices.listAllDue', 'customerInvoices.listOwnDue'] },
                    { label: 'Credit Notes', to: '/customers/credit-notes', canAny: ['customerCreditNotes.listAll', 'customerCreditNotes.listOwn'] },
                ],
            },
            {
                label: 'Suppliers',
                items: [
                    { label: 'All Suppliers', to: '/suppliers', can: 'suppliers.list' },
                    { label: 'New Supplier', to: '/suppliers/create', can: 'suppliers.create' },
                ],
            },
            {
                label: 'Payment Methods',
                items: [
                    { label: 'All Payment Methods', to: '/payment-methods', can: 'paymentMethods.list' },
                    { label: 'New Payment Method', to: '/payment-methods/create', can: 'paymentMethods.create' },
                ],
            },
            {
                label: 'Journals',
                items: [
                    { label: 'All Journals', to: '/journals', can: 'journals.list' },
                    { label: 'New Journal', to: '/journals/create', can: 'journals.create' },
                ],
            },
            {
                label: 'Z-Reports',
                items: [
                    { label: 'All Z-Reports', to: '/z-reports', can: 'zReports.list' },
                    { label: 'New Z-Report', to: '/z-reports/create', can: 'zReports.create' },
                ],
            },
            {
                label: 'Tax Types',
                items: [
                    { label: 'All Tax Types', to: '/tax-types', can: 'taxTypes.list' },
                    { label: 'New Tax Type', to: '/tax-types/create', can: 'taxTypes.create' },
                ],
            },
            {
                label: 'Emails',
                items: [
                    { label: 'Sent Emails', to: '/sent-emails', can: 'sentEmails.list' },
                ],
            },
        ],
    },
];

/**
 * Header account-dropdown links, permission-filtered like the platform's.
 */
export const userMenu = [
    { label: 'Notifications', to: '/notifications', can: 'userNotifications.list' },
    { label: 'Profile', to: '/profile', can: 'users.editProfile' },
    { label: 'Update password', to: '/password', can: 'users.editPassword' },
    { label: 'Apply for vacation', to: '/vacations/apply', can: 'vacations.applyForm' },
];
