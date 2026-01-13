import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SmartERS - Emergency Response System',
  description: 'Smart Emergency Response System for efficient ambulance dispatch and incident management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* ArcGIS CDN styles (MUST be here, not in globals.css) */}
        <link
          rel="stylesheet"
          href="https://js.arcgis.com/4.34/esri/themes/light/main.css"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
