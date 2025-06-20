import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function formatDuration(start: string, end?: string): string {
  const startTime = new Date(start)
  const endTime = end ? new Date(end) : new Date()
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
  return formatTime(duration)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getRiskColor(riskScore: number): string {
  if (riskScore >= 70) return 'text-red-600 bg-red-50'
  if (riskScore >= 40) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}

export function getRiskLevel(riskScore: number): string {
  if (riskScore >= 70) return 'High'
  if (riskScore >= 40) return 'Medium'
  return 'Low'
}