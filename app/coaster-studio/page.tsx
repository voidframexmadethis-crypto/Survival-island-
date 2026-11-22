import type { Metadata } from 'next';
import { CoasterStudioClient } from '@/components/coaster/CoasterStudioClient';

export const metadata: Metadata = {
  title: 'Ultimate Coaster Studio | Survival Island',
  description:
    'Standalone 3D roller coaster construction studio with manual spline track editing, a manufacturer catalog, mechanical systems, ride physics, and a 3D train designer. No premade coasters.',
};

export default function CoasterStudioPage() {
  return <CoasterStudioClient />;
}
