import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
}

const variantClasses = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800',
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'assigned':
      case 'en-route':
        return 'info'
      case 'completed':
      case 'available':
        return 'success'
      case 'busy':
      case 'offline':
        return 'danger'
      default:
        return 'default'
    }
  }

  return <Badge variant={getVariant()}>{status}</Badge>
}

export function SeverityBadge({ severity }: { severity: string }) {
  const getVariant = () => {
    switch (severity) {
      case 'critical':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'info'
      case 'low':
        return 'success'
      default:
        return 'default'
    }
  }

  return <Badge variant={getVariant()}>{severity}</Badge>
}
