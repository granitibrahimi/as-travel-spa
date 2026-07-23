// HR domain: users, roles, permissions, work schedule, official holidays,
// vacations, and the password page.
const WorkScheduleCalendar = () => import('../../pages/Users/WorkSchedule/Calendar.vue');
const WorkScheduleIndex = () => import('../../pages/Users/WorkSchedule/Index.vue');
const OfficialHolidaysIndex = () => import('../../pages/Users/OfficialHolidays/Index.vue');
const OfficialHolidaysManage = () => import('../../pages/Users/OfficialHolidays/Manage.vue');


export default [

    { path: '/work-schedule', name: 'workSchedule.calendar', component: WorkScheduleCalendar },
    { path: '/work-schedule/edit', name: 'workSchedule.list', component: WorkScheduleIndex },
    { path: '/official-holidays', name: 'officialHolidays.list', component: OfficialHolidaysIndex },
    { path: '/official-holidays/create', name: 'officialHolidays.create', component: OfficialHolidaysManage },
    { path: '/official-holidays/:id/edit', name: 'officialHolidays.edit', component: OfficialHolidaysManage },

];
