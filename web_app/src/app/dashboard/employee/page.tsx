'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Download, BarChart3, Calendar, Timer, LogOut, User, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { employeeAPI } from '@/lib/api'
import { formatDuration, formatDateTime } from '@/lib/utils'
import Cookies from 'js-cookie'

interface TimeLog {
  id: number
  project_id: number
  start_time: string
  end_time?: string
  duration?: number
  project_name?: string
}

interface EmployeeStats {
  total_hours_today: number
  total_hours_week: number
  total_hours_month: number
  active_sessions: number
  projects_count: number
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<EmployeeStats | null>(null)
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userData = Cookies.get('user_data')
    const userType = Cookies.get('user_type')
    
    if (!userData || userType !== 'employee') {
      router.push('/login/employee')
      return
    }

    setUser(JSON.parse(userData))
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      const [profileRes, statsRes, timeLogsRes] = await Promise.all([
        employeeAPI.getProfile(),
        employeeAPI.getStats(),
        employeeAPI.getTimeLogs(10)
      ])

      setStats(statsRes.data)
      setTimeLogs(timeLogsRes.data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadApp = async () => {
    try {
      const response = await employeeAPI.downloadApp()
      const blob = new Blob([response.data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'mercor-time-tracker.exe'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download app:', error)
    }
  }

  const handleLogout = () => {
    Cookies.remove('auth_token')
    Cookies.remove('user_type')
    Cookies.remove('user_data')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Mercor</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Employee Portal
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            Track your time, view statistics, and download the desktop app.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_hours_today ? `${stats.total_hours_today}h` : '0h'}
              </div>
              <p className="text-xs text-muted-foreground">
                Hours logged today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_hours_week ? `${stats.total_hours_week}h` : '0h'}
              </div>
              <p className="text-xs text-muted-foreground">
                Hours this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_hours_month ? `${stats.total_hours_month}h` : '0h'}
              </div>
              <p className="text-xs text-muted-foreground">
                Hours this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.active_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently tracking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Download App */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-blue-600" />
                <span>Desktop Time Tracker</span>
              </CardTitle>
              <CardDescription>
                Download the desktop application to start tracking your time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Features included:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Automatic time tracking</li>
                    <li>Screenshot capture</li>
                    <li>Project management</li>
                    <li>Offline capability</li>
                  </ul>
                </div>
                <Button onClick={handleDownloadApp} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download App
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <span>Quick Overview</span>
              </CardTitle>
              <CardDescription>
                Your productivity at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Projects assigned</span>
                  <Badge variant="outline">{stats?.projects_count || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Account status</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last activity</span>
                  <span className="text-sm text-gray-500">
                    {timeLogs[0] ? formatDateTime(timeLogs[0].start_time) : 'No activity'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Time Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Logs</CardTitle>
            <CardDescription>
              Your latest time tracking sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeLogs.length > 0 ? (
              <div className="space-y-4">
                {timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.project_name || `Project ${log.project_id}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(log.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {log.end_time ? formatDuration(log.start_time, log.end_time) : 'In Progress'}
                      </p>
                      <Badge variant={log.end_time ? "secondary" : "default"}>
                        {log.end_time ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No time logs yet</p>
                <p className="text-sm text-gray-400">Download the app to start tracking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}