import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
}

export default function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-center">
        {icon && (
          <div className={`flex-shrink-0 ${colorClasses[color]} rounded-md p-3 text-white`}>
            {icon}
          </div>
        )}
        <div className={icon ? 'ml-5 w-0 flex-1' : 'flex-1'}>
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend && (
                <div
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.isPositive ? '↑' : '↓'} {trend.value}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
