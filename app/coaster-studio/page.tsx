import type { Metadata } from 'next';
import { CoasterStudioClient } from '@/components/coaster/CoasterStudioClient';

export const metadata: Metadata = {
  title: 'Ultimate Coaster Studio | Survival Island',
  description:
    'Standalone 3D roller coaster construction studio with spline track editing, mechanical systems, ride physics, and a prompt-driven train designer.',
};

export default function CoasterStudioPage() {
  return <CoasterStudioClient />;
}
