export type NavigationItemId = 'dashboard' | 'feed' | 'classes' | 'students' | 'attendance' | 'activities' | 'announcements' | 'reports' | 'utilities';

export interface NavigationItem {
  id: NavigationItemId;
  icon: string;
  label: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: readonly NavigationItem[];
}

const teacherGroups: readonly NavigationGroup[] = [
  {id: 'workspace', label: 'Workspace', items: [
    {id: 'dashboard', icon: 'home', label: 'Overview'},
  ]},
  {id: 'teaching', label: 'Teaching', items: [
    {id: 'classes', icon: 'school', label: 'Classes'},
    {id: 'students', icon: 'groups', label: 'Students'},
    {id: 'attendance', icon: 'fact_check', label: 'Attendance'},
    {id: 'activities', icon: 'assignment', label: 'Activities'},
  ]},
  {id: 'communication', label: 'Communication', items: [
    {id: 'feed', icon: 'dynamic_feed', label: 'Feed'},
    {id: 'announcements', icon: 'campaign', label: 'Announcements'},
  ]},
  {id: 'insights-tools', label: 'Insights & tools', items: [
    {id: 'reports', icon: 'analytics', label: 'Reports'},
    {id: 'utilities', icon: 'settings', label: 'Utilities'},
  ]},
];

const studentGroups: readonly NavigationGroup[] = [
  {id: 'communication', label: 'Communication', items: [
    {id: 'feed', icon: 'dynamic_feed', label: 'Feed'},
    {id: 'announcements', icon: 'campaign', label: 'Announcements'},
  ]},
  {id: 'learning', label: 'Learning', items: [
    {id: 'classes', icon: 'school', label: 'My Classes'},
    {id: 'activities', icon: 'assignment', label: 'Activities & Scores'},
    {id: 'attendance', icon: 'fact_check', label: 'My Attendance'},
  ]},
];

export function getNavigationGroups(role: 'teacher' | 'student'): readonly NavigationGroup[] {
  return role === 'student' ? studentGroups : teacherGroups;
}

export function activeNavigationItem(view: string): NavigationItemId | undefined {
  if (view === 'student-profile') return 'students';
  if (view === 'submit-activity' || view === 'review-quiz') return 'activities';
  return teacherGroups.flatMap(group => group.items).find(item => item.id === view)?.id;
}
