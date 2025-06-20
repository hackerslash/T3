'use client'

import Link from "next/link"
import { Clock, Shield, Users, BarChart3, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Mercor</span>
            <span className="text-sm text-gray-500">Time Tracker</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Time Tracking
            <span className="block text-blue-600">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your workforce management with advanced time tracking, 
            fraud detection, and comprehensive analytics. Built for modern remote teams.
          </p>
          
          {/* Login Options */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
            {/* Employee Login */}
            <Card className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Employee Portal</CardTitle>
                <CardDescription className="text-base">
                  Access your time tracking dashboard and download the desktop app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>View your time logs and statistics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download desktop time tracker</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Track your productivity metrics</span>
                  </div>
                </div>
                <Link href="/login/employee" className="block">
                  <Button className="w-full" size="lg">
                    Employee Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Admin/Merchant Login */}
            <Card className="hover:shadow-lg transition-shadow border-2 hover:border-indigo-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
                  <Shield className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
                <CardDescription className="text-base">
                  Manage employees, projects, and monitor workforce activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Manage employees and projects</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Advanced analytics and reporting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Fraud detection and security</span>
                  </div>
                </div>
                <Link href="/login/admin" className="block">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg">
                    Admin Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Enterprise-Grade Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Accurate Time Tracking</h3>
              <p className="text-gray-600">
                Precise time logging with automatic screenshot capture and activity monitoring
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fraud Detection</h3>
              <p className="text-gray-600">
                Advanced algorithms detect suspicious patterns and prevent time theft
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Analytics</h3>
              <p className="text-gray-600">
                Comprehensive reports and insights to optimize team productivity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Clock className="h-6 w-6" />
            <span className="text-xl font-bold">Mercor Time Tracker</span>
          </div>
          <p className="text-gray-400">
            Professional workforce management for the modern era
          </p>
        </div>
      </footer>
    </div>
  )
}