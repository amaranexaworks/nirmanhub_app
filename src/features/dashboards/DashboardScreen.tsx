import { useRoleContext } from '@features/roles/useRoleContext';
import { SeekerDashboard } from './SeekerDashboard';
import { WorkerDashboard } from './WorkerDashboard';
import { ExpertDashboard } from './ExpertDashboard';
import { OrchestratorDashboard } from './OrchestratorDashboard';
import { VendorDashboard } from './VendorDashboard';
import { FinancierDashboard } from './FinancierDashboard';

/**
 * The "home" tab renders the dashboard template for the active archetype.
 * One screen, six layouts — see docs/05-screens-wireframes.md.
 */
export function DashboardScreen() {
  const { archetype } = useRoleContext();

  switch (archetype) {
    case 'seeker':
      return <SeekerDashboard />;
    case 'worker':
      return <WorkerDashboard />;
    case 'expert':
      return <ExpertDashboard />;
    case 'orchestrator':
      return <OrchestratorDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    case 'financier':
      return <FinancierDashboard />;
    default:
      return <SeekerDashboard />;
  }
}
