'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, Users, BarChart3, AlertTriangle, Clock, 
  LogOut, Settings, Plus, Search, Filter, Eye,
  TrendingUp, Activity, Calendar, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { adminAPI } from '@/lib/api'
import { formatDateTime, getRiskColor, getRiskLevel } from '@/lib/utils'
import Cookies from 'js-cookie'

interface DashboardStats {
  total_employees: number
  active_employees: number
  total_projects: number
  active_sessions: number
  total_hours_today: number
  fraud_alerts_count: number
}

interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  created_at: string
  last_activity?: string
}

interface FraudAlert {
  id: number
  user_id: number
  alert_type: string
  risk_score: number
  flags: string
  resolved: boolean
  created_at: string
  user_name?: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'fraud' | 'analytics'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    const userData = Cookies.get('user_data')
    const userType = Cookies.get('user_type')
    
    if (!userData || userType !== 'admin') {
      router.push('/login/admin')
      return
    }

    setUser(JSON.parse(userData))
    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    try {
      const [employeesRes, fraudAlertsRes, fraudStatsRes] = await Promise.all([
        adminAPI.getEmployees(),
        adminAPI.getFraudAlerts({ limit: 10 }),
        adminAPI.getFraudStats()
      ])

      setEmployees(employeesRes.data)
      setFraudAlerts(fraudAlertsRes.data)
      
      // Calculate dashboard stats
      const activeEmployees = employeesRes.data.filter(emp => emp.is_active).length
      setStats({
        total_employees: employeesRes.data.length,
        active_employees: activeEmployees,
        total_projects: 0, // Will be loaded separately
        active_sessions: 0, // Will be loaded separately
        total_hours_today: 0, // Will be loaded separately
        fraud_alerts_count: fraudStatsRes.data.total_alerts
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    Cookies.remove('auth_token')
    Cookies.remove('user_type')
    Cookies.remove('user_data')
    router.push('/')
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unresolvedAlerts = fraudAlerts.filter(alert => !alert.resolved)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900">Mercor Admin</span>
              </div>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                Management Dashboard
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'employees', label: 'Employees', icon: Users },
              { id: 'fraud', label: 'Fraud Detection', icon: AlertTriangle },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'fraud' && unresolvedAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {unresolvedAlerts.length}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Dashboard Overview
              </h1>
              <p className="text-gray-600">
                Monitor your workforce and system performance at a glance.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_employees || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.active_employees || 0} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.active_sessions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently tracking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_hours_today || 0}h</div>
                  <p className="text-xs text-muted-foreground">
                    Across all employees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {unresolvedAlerts.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            {unresolvedAlerts.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Recent Fraud Alerts</span>
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    Suspicious activities requiring immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {unresolvedAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getRiskColor(alert.risk_score)}`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {alert.user_name || `User ${alert.user_id}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              {alert.alert_type} - {formatDateTime(alert.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getRiskColor(alert.risk_score)}>
                          {getRiskLevel(alert.risk_score)} Risk ({alert.risk_score}%)
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setActiveTab('fraud')}
                  >
                    View All Alerts
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                <p className="text-gray-600">Manage your workforce and monitor activity</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Employees List */}
            <Card>
              <CardHeader>
                <CardTitle>All Employees ({filteredEmployees.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-500">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fraud Detection Tab */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
              <p className="text-gray-600">Monitor and investigate suspicious activities</p>
            </div>

            {/* Fraud Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">High Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {fraudAlerts.filter(a => a.risk_score >= 70).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-600">Medium Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {fraudAlerts.filter(a => a.risk_score >= 40 && a.risk_score < 70).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-600">Low Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {fraudAlerts.filter(a => a.risk_score < 40).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fraud Alerts List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Fraud Alerts</CardTitle>
                <CardDescription>
                  Investigate and resolve suspicious activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fraudAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${getRiskColor(alert.risk_score)}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {alert.user_name || `User ${alert.user_id}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {alert.alert_type} - {formatDateTime(alert.created_at)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Flags: {alert.flags}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getRiskColor(alert.risk_score)}>
                          {getRiskLevel(alert.risk_score)} ({alert.risk_score}%)
                        </Badge>
                        <Badge variant={alert.resolved ? "secondary" : "destructive"}>
                          {alert.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                        {!alert.resolved && (
                          <Button variant="outline" size="sm">
                            Investigate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600">Comprehensive insights into workforce productivity</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Productivity Trends</CardTitle>
                  <CardDescription>
                    Weekly productivity analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Analytics charts will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                  <CardDescription>
                    How time is spent across projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Project time distribution chart</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>
                  Download detailed reports for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Time Logs Report
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Productivity Report
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Fraud Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}