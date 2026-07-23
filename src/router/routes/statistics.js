const ReportCountInvoices = () => import('../../pages/Statistics/CountInvoices.vue');
const ReportSalesWithSvc = () => import('../../pages/Statistics/SalesWithSvc.vue');
const ReportDaysBeforeEvent = () => import('../../pages/Statistics/DaysBeforeEvent.vue');
const ReportEmployeeContribution = () => import('../../pages/Statistics/EmployeeContribution.vue');
const ReportMonthConcentration = () => import('../../pages/Statistics/MonthConcentration.vue');
const ReportRanking = () => import('../../pages/Statistics/EmployeeRanking.vue');
const ReportCustomers = () => import('../../pages/Statistics/Customers.vue');
const ReportAllCounts = () => import('../../pages/Statistics/AllCounts.vue');

export default [
    { path: '/statistics/count-invoices', name: 'statistics.countInvoices', component: ReportCountInvoices },
    { path: '/statistics/sales-with-svc', name: 'statistics.salesWithSvc', component: ReportSalesWithSvc },
    { path: '/statistics/days-before-event', name: 'statistics.daysBeforeEvent', component: ReportDaysBeforeEvent },
    { path: '/statistics/employee-contribution', name: 'statistics.employeeContribution', component: ReportEmployeeContribution },
    { path: '/statistics/month-concentration', name: 'statistics.monthConcentration', component: ReportMonthConcentration },
    { path: '/statistics/ranking', name: 'statistics.ranking', component: ReportRanking },
    { path: '/statistics/customers', name: 'statistics.customers', component: ReportCustomers },
    { path: '/statistics/all-counts', name: 'statistics.allCounts', component: ReportAllCounts }
];
