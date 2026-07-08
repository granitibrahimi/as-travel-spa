/**
 * Workspaces + navigation for the SPA — mirrors the platform's
 * config/workspaces.php. The sidebar is built by filtering these by the
 * current user's permissions (from /me): each item shows when the user holds
 * its `can` permission or any of its `canAny` permissions (admins see all).
 *
 * `to` values are SPA router paths. Some routes are not migrated yet, so their
 * links resolve to the NotFound page until the page exists.
 *
 * A `groups` entry of `{ separator: true }` renders a horizontal line in the
 * sidebar, letting you split a workspace's groups into sections. Separators
 * that would end up at the top/bottom or back-to-back (after permission
 * filtering hides neighbouring groups) are dropped automatically.
 */
export const workspaces = [
    {
        key: 'crm',
        label: 'CRM',
        can: 'crm.access',
        home: '/',
        groups: [
            {
                label: 'Departures',
                items: [
                    { label: 'Departure Info', to: '/departures/overview', can: 'departureInfo.overview' },
                    { label: 'All Departures', to: '/departures', can: 'departureInfo.list' },
                ],
            },
            {
                label: 'Work Schedule',
                items: [
                    { label: 'Work Schedule', to: '/work-schedule', can: 'workSchedule.list' },
                ],
            },
            {
                label: 'New Announcement',
                items: [
                    { label: 'New Announcement', to: '/announcements/create', can: 'announcements.create' },
                ],
            },
            {
                label: 'New Support Ticket',
                items: [
                    { label: 'New Support Ticket', to: '/support/create', can: 'support.create' },
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
            { separator: true },
            {
                label: 'Invoices',
                items: [
                    { label: 'Invoices', to: '/customers/invoices', can: 'customerInvoices.list' },
                ],
            },
            {
                label: 'Due Invoices',
                items: [
                    { label: 'Invoices', to: '/customers/invoices/due', can: 'customerInvoices.due' },
                ],
            },
            {
                label: 'Credit Notes',
                items: [
                    { label: 'Credit Notes', to: '/customers/credit-notes', can: 'customerCreditNotes.list' },
                ],
            },
            {
                label: 'Customers',
                items: [
                    { label: 'All Customers', to: '/customers', can: 'customers.list' },
                    { label: 'New Customer', to: '/customers/create', can: 'customers.create' },
                    { label: 'Gift Cards', to: '/customer-gift-cards', can: 'customerGiftCards.list' },
                    { label: 'Reconciliations', to: '/customer-reconciliations', can: 'customerReconciliations.list' },
                    { label: 'Customer Transactions', to: '/customer-transaction-links', can: 'customerTransactionsLinks.list' },
                    { label: 'All Invoices', to: '/customers/invoices', canAny: ['customerInvoices.listAll', 'customerInvoices.listOwn'] },
                    { label: 'Due Invoices', to: '/customers/invoices/due', canAny: ['customerInvoices.listAllDue', 'customerInvoices.listOwnDue'] },
                    { label: 'Credit Notes', to: '/customers/credit-notes', canAny: ['customerCreditNotes.listAll', 'customerCreditNotes.listOwn'] },
                ],
            },
            { separator: true },
            {
                label: 'Static Offers',
                items: [
                    { label: 'All Offers', to: '/offers', can: 'staticOffers.list' },
                    { label: 'New Offer', to: '/offers/create', can: 'staticOffers.create' },
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
                label: 'Destinations',
                items: [
                    { label: 'All Destinations', to: '/destinations', can: 'destinations.list' },
                    { label: 'New Destination', to: '/destinations/create', can: 'destinations.create' },
                    { label: 'Parent Destinations', to: '/parent-destinations', can: 'parentDestinations.list' },
                    { label: 'New Parent Destination', to: '/parent-destinations/create', can: 'parentDestinations.create' },
                ],
            },
            {
                label: 'Announcements',
                items: [
                    { label: 'List', to: '/announcements', can: 'announcements.list' },
                    { label: 'Create', to: '/announcements/create', can: 'announcements.create' },
                ],
            },
            {
                label: 'Hotels',
                items: [
                    { label: 'List', to: '/hotels', can: 'hotels.list' },
                    { label: 'Create', to: '/hotels/create', can: 'hotels.create' },
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
            {
                label: 'Messages',
                items: [
                    { label: 'All Messages', to: '/messages', can: 'messages.list' },
                    { label: 'New Message', to: '/messages/create', can: 'messages.create' },
                ],
            },
            {
                label: 'Announcements',
                items: [
                    { label: 'All Announcements', to: '/announcements', can: 'announcements.list' },
                    { label: 'New Announcement', to: '/announcements/create', can: 'announcements.create' },
                ],
            },
            {
                label: 'Support',
                items: [
                    { label: 'Support Tickets', to: '/support', can: 'supportTickets.list' },
                    { label: 'New Ticket', to: '/support/create', can: 'supportTickets.create' },
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
                ],
            },
            {
                label: 'Messages',
                items: [
                    { label: 'All Messages', to: '/messages', can: 'messages.list' },
                    { label: 'New Message', to: '/messages/create', can: 'messages.create' },
                ],
            },
            {
                label: 'Work Schedule',
                items: [
                    { label: 'Work Schedule', to: '/work-schedule', can: 'workSchedule.calendar' },
                    { label: 'Edit Work Schedule', to: '/work-schedule/edit', can: 'workSchedule.index' },
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
                    { label: 'Gift Cards', to: '/customer-gift-cards', can: 'customerGiftCards.list' },
                    { label: 'Reconciliations', to: '/customer-reconciliations', can: 'customerReconciliations.list' },
                    { label: 'Customer Transactions', to: '/customer-transaction-links', can: 'customerTransactionsLinks.list' },
                ],
            },
            {
                label: 'Suppliers',
                items: [
                    { label: 'All Suppliers', to: '/suppliers', can: 'suppliers.list' },
                    { label: 'New Supplier', to: '/suppliers/create', can: 'suppliers.create' },
                    { label: 'Deposits', to: '/supplier-deposits', can: 'supplierDeposits.list' },
                    { label: 'Payments', to: '/supplier-payments', can: 'supplierPayments.list' },
                    { label: 'Gift Cards', to: '/supplier-gift-cards', can: 'supplierGiftCards.list' },
                    { label: 'Refunds', to: '/supplier-refunds', can: 'supplierRefunds.list' },
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
                label: 'Account Transfers',
                items: [
                    { label: 'All Transfers', to: '/account-transfers', can: 'accountTransfers.list' },
                    { label: 'New Transfer', to: '/account-transfers/create', can: 'accountTransfers.create' },
                ],
            },
            {
                label: 'Petty Cash',
                items: [
                    { label: 'Transfers List', to: '/petty-cash', can: 'pettyCash.list' },
                    { label: 'Daily Cash to Petty Cash', to: '/petty-cash/deposit', can: 'pettyCash.deposit' },
                    { label: 'Bank to Petty Cash', to: '/petty-cash/deposit-from-bank', can: 'pettyCash.depositFromBank' },
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
                label: 'Bank Deposits',
                items: [
                    { label: 'All Bank Deposits', to: '/bank-deposits', can: 'bankDeposits.list' },
                    { label: 'New Bank Deposit', to: '/bank-deposits/create', can: 'bankDeposits.create' },
                ],
            },
            {
                label: 'Expenses',
                items: [
                    { label: 'All Expenses', to: '/expenses', can: 'expenses.list' },
                    { label: 'New Expense', to: '/expenses/create', can: 'expenses.create' },
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
            {
                label: 'Messages',
                items: [
                    { label: 'All Messages', to: '/messages', can: 'messages.list' },
                    { label: 'New Message', to: '/messages/create', can: 'messages.create' },
                ],
            },
        ],
    },
    {
        key: 'administration',
        label: 'Administration',
        can: 'administration.access',
        home: '/',
        groups: [
            {
                label: 'Reports',
                items: [
                    { label: 'Count Invoices', to: '/statistics/count-invoices', can: 'statistics.countInvoices' },
                    { label: 'Sales with SVC', to: '/statistics/sales-with-svc', can: 'statistics.salesWithSvc' },
                    { label: 'Days Before Event', to: '/statistics/days-before-event', can: 'statistics.daysBeforeEventStats' },
                    { label: 'Employee Contribution', to: '/statistics/employee-contribution', can: 'statistics.employeeContribution' },
                    { label: 'Month Concentration', to: '/statistics/month-concentration', can: 'statistics.monthConcentrationSales' },
                    { label: 'Employee Ranking', to: '/statistics/ranking', can: 'statistics.ranking' },
                    { label: 'Customers', to: '/statistics/customers', can: 'statistics.customers' },
                    { label: 'All Counts', to: '/statistics/all-counts', can: 'statistics.allCounts' },
                ],
            },
            {
                label: 'Products',
                items: [
                    { label: 'All Products', to: '/products', can: 'products.list' },
                    { label: 'New Product', to: '/products/create', can: 'products.create' },
                ],
            },
            {
                label: 'Projects',
                items: [
                    { label: 'Active', to: '/projects', can: 'customerProjects.list' },
                    { label: 'Finished', to: '/projects/finished', can: 'customerProjects.finished' },
                    { label: 'Create', to: '/projects/create', can: 'customerProjects.create' },
                ],
            },
            {
                label: 'Online Users',
                items: [
                    { label: 'All Users', to: '/online-users', can: 'onlineUsers.list' },
                ],
            },
            {
                label: 'QuickBooks',
                items: [
                    { label: 'Sync Data', to: '/quickbooks/sync', can: 'quickBooksSync.list' },
                ],
            },
        ]
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
