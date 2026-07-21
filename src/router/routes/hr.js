// HR domain: users, roles, permissions, work schedule, official holidays,
// vacations, and the password page.
const WorkScheduleCalendar = () => import('../../pages/Users/WorkSchedule/Calendar.vue');
const WorkScheduleIndex = () => import('../../pages/Users/WorkSchedule/Index.vue');
const OfficialHolidaysIndex = () => import('../../pages/Users/OfficialHolidays/Index.vue');
const OfficialHolidaysManage = () => import('../../pages/Users/OfficialHolidays/Manage.vue');
const VacationsOverview = () => import('../../pages/Users/Vacations/Overview.vue');
const VacationsApply = () => import('../../pages/Users/Vacations/Apply.vue');
const VacationsRequests = () => import('../../pages/Users/Vacations/Requests.vue');
const VacationsShow = () => import('../../pages/Users/Vacations/Show.vue');
const VacationsEdit = () => import('../../pages/Users/Vacations/Edit.vue');
const VacationsEditBalance = () => import('../../pages/Users/Vacations/EditBalance.vue');

export default [

    { path: '/work-schedule', name: 'workSchedule.calendar', component: WorkScheduleCalendar },
    { path: '/work-schedule/edit', name: 'workSchedule.list', component: WorkScheduleIndex },
    { path: '/official-holidays', name: 'officialHolidays.list', component: OfficialHolidaysIndex },
    { path: '/official-holidays/create', name: 'officialHolidays.create', component: OfficialHolidaysManage },
    { path: '/official-holidays/:id/edit', name: 'officialHolidays.edit', component: OfficialHolidaysManage },
    { path: '/vacations', name: 'vacations.list', component: VacationsOverview },
    { path: '/vacations/apply', name: 'vacations.apply', component: VacationsApply },
    { path: '/vacations/requests', name: 'vacations.requests', component: VacationsRequests },
    { path: '/vacations/:userId/balance', name: 'vacations.balance', component: VacationsEditBalance },
    { path: '/vacations/:id/edit', name: 'vacations.edit', component: VacationsEdit },
    { path: '/vacations/:id', name: 'vacations.show', component: VacationsShow },
];
