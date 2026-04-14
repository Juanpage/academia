import './globals.css';

export const metadata = {
  title:       'Academia Militar Digital',
  description: 'Sistema de gestión de aspirantes — Fuerzas Armadas Ecuador',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
