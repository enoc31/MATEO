import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mateo-ekklesia.com'),
  title: 'MATEO ekklesia - Gestión Financiera para Iglesias y Ministerios',
  description:
    'MATEO ekklesia - Plataforma de gestión financiera para iglesias y ministerios. Diezmos, ofrendas, presupuestos, auditoría y transparencia en una sola plataforma.',
  icons: { icon: '/mateo_logo.png' },
  openGraph: {
    type: 'website',
    title: 'MATEO ekklesia - Gestión Financiera para Iglesias',
    description:
      'Transparencia financiera para tu iglesia. Gestiona diezmos, ofrendas, presupuestos y auditoría con MATEO ekklesia.',
    images: ['/mateo_logo.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
