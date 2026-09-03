import { PageShell } from './PageShell';
import { EmptyState } from '@design/patterns';
import { constructOutline } from 'ionicons/icons';

/**
 * Stub for tab destinations whose feature module isn't built yet.
 * Replace each with the real feature page (features/<feature>/pages/*).
 */
export function PlaceholderPage({ title, note }: { title: string; note?: string }) {
  return (
    <PageShell title={title}>
      <EmptyState
        icon={constructOutline}
        title={`${title} — coming soon`}
        message={note ?? 'This feature module is scaffolded. Wire up its pages, hooks, and api under features/.'}
      />
    </PageShell>
  );
}
