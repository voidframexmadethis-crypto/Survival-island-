import type { Metadata, Viewport } from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

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
    <html
      lang="en"
      className={`${cinzel.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        className="bg-stone-950 text-stone-100 antialiased selection:bg-amber-500/30 overflow-x-hidden overflow-y-scroll"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
