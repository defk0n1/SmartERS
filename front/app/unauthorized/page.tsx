'use client'

import Link from 'next/link'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full text-center">
        <ShieldExclamationIcon className="mx-auto h-24 w-24 text-emergency-500" />
        <h1 className="mt-6 text-4xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-lg text-gray-600">
          You don't have permission to access this page.
        </p>
        <div className="mt-8">
          <Link href="/" className="btn-primary inline-block">
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
