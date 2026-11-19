import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SURVIVAL ISLAND: LOST WORLD | AdventureForgeGames',
  description:
    'Realistic 3D prehistoric survival simulator by AdventureForgeGames — gather resources, craft tools, hunt wildlife, roast meals, and survive dinosaurs.',
  openGraph: {
    title: 'SURVIVAL ISLAND: LOST WORLD',
    description:
      'Realistic 3D prehistoric survival simulator by AdventureForgeGames — Stage 1 Development.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SURVIVAL ISLAND: LOST WORLD',
    description:
      'Realistic 3D prehistoric survival simulator by AdventureForgeGames — Stage 1 Development.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Survival Island',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-stone-950 text-stone-100 antialiased selection:bg-amber-500/30 overflow-x-hidden overflow-y-scroll"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
