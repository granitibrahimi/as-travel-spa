// CRM operations: tasks, support tickets, and the statistics reports.
// Order note: `/tasks/dashboard` and `/tasks/create` precede `/tasks/:id`.
const TasksIndex = () => import('../../pages/Tasks/Index.vue');
const TasksDashboard = () => import('../../pages/Tasks/Dashboard.vue');
const TasksCreate = () => import('../../pages/Tasks/Create.vue');
const TasksShow = () => import('../../pages/Tasks/Show.vue');
const SupportIndex = () => import('../../pages/Support/Index.vue');
const SupportCreate = () => import('../../pages/Support/Create.vue');
const SupportShow = () => import('../../pages/Support/Show.vue');
const ReportCountInvoices = () => import('../../pages/Statistics/CountInvoices.vue');
const ReportSalesWithSvc = () => import('../../pages/Statistics/SalesWithSvc.vue');
const ReportDaysBeforeEvent = () => import('../../pages/Statistics/DaysBeforeEvent.vue');
const ReportEmployeeContribution = () => import('../../pages/Statistics/EmployeeContribution.vue');
const ReportMonthConcentration = () => import('../../pages/Statistics/MonthConcentration.vue');
const ReportRanking = () => import('../../pages/Statistics/EmployeeRanking.vue');
const ReportCustomers = () => import('../../pages/Statistics/Customers.vue');
const ReportAllCounts = () => import('../../pages/Statistics/AllCounts.vue');

export default [
    { path: '/tasks', name: 'tasks.list', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/support', name: 'support.list', component: SupportIndex },
    { path: '/support/create', name: 'support.create', component: SupportCreate },
    { path: '/support/:id', name: 'support.show', component: SupportShow },
    { path: '/statistics/count-invoices', name: 'statistics.countInvoices', component: ReportCountInvoices },
    { path: '/statistics/sales-with-svc', name: 'statistics.salesWithSvc', component: ReportSalesWithSvc },
    { path: '/statistics/days-before-event', name: 'statistics.daysBeforeEvent', component: ReportDaysBeforeEvent },
    { path: '/statistics/employee-contribution', name: 'statistics.employeeContribution', component: ReportEmployeeContribution },
    { path: '/statistics/month-concentration', name: 'statistics.monthConcentration', component: ReportMonthConcentration },
    { path: '/statistics/ranking', name: 'statistics.ranking', component: ReportRanking },
    { path: '/statistics/customers', name: 'statistics.customers', component: ReportCustomers },
    { path: '/statistics/all-counts', name: 'statistics.allCounts', component: ReportAllCounts },
];
