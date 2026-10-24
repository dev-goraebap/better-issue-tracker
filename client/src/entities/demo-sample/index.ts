// Sample data for the UI demo: fixed mock workspaces, projects, work items, decisions, sessions and notices, schedules made on the visit, their URL
// conditions, the demo's menus (the real app's under /demo) and the rows that draw them, shared by the /demo pages.
export * from './model/mock';
export * from './model/search';
export * from './model/navigation';
export { addWorkspace, useWorkspaces } from './model/workspaces';
export { addProject, useProjects } from './model/projects';
export {
  addIssue, DECISION_LABEL, DECISION_STATES, ISSUE_LABELS, issueDays, issueOf, ISSUES, LABEL_COLORS, useIssues, type DecisionState, type Issue,
} from './model/issues';
export {
  ALL_VIEW, addView, canEditView, effectiveView, FILTER_KEYS, filterIssues, NO_FILTER, removeView, setViewTweak, updateView, useViews, useViewTweak,
  VIEW_COLORS, VIEW_COLUMNS, VIEW_ICONS, VIEW_LAYOUTS, type IssueView, type ViewColumn, type ViewFilters, type ViewLayout, type ViewSearch, type ViewSort, type ViewTweak,
} from './model/views';
export { markAllRead, markRead, markUnread, useReadNotices } from './model/read-notices';
export { WorkspaceMark } from './ui/WorkspaceMark';
export { PersonCell } from './ui/PersonCell';
export { StatusBadge } from './ui/StatusBadge';
export { PriorityMark } from './ui/PriorityMark';
export { LabelTokens } from './ui/LabelTokens';
export { IssueTable } from './ui/IssueTable';
export { IssueRows } from './ui/IssueRows';
export { default as demoStyles } from './ui/demo.module.css';
