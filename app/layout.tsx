import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TMP Eventos',
  description: 'Gestión de eventos sociales — bodas, quinces, cumpleaños y baby showers.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
