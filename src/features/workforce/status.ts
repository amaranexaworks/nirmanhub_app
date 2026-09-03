import type { ProjectStatus } from '@services/api/workforceApi';

/** Label + badge tone for each project/site status. */
export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};

/** Order used in status pickers. */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ['not_started', 'in_progress', 'completed'];

/** Read a status off a backend project row, defaulting to in_progress. */
export function projectStatusOf(row: any): ProjectStatus {
  const s = row?.sts_cd;
  return s === 'not_started' || s === 'completed' ? s : 'in_progress';
}
