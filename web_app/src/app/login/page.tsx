'use client'

import Link from "next/link"
import { Clock, Users, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Clock className="h-10 w-10 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">Mercor</span>
            <span className="text-lg text-gray-500">Time Tracker</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Choose Your Login Type</h1>
          <p className="text-gray-600">Select the appropriate portal for your role</p>
        </div>

        {/* Login Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Employee Login */}
          <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 hover:scale-105">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Employee Login</CardTitle>
              <CardDescription>
                Access your personal dashboard and download the time tracker
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login/employee" className="block">
                <Button className="w-full" size="lg">
                  Continue as Employee
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Login */}
          <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-indigo-300 hover:scale-105">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-indigo-100 rounded-full w-fit">
                <Shield className="h-10 w-10 text-indigo-600" />
              </div>
              <CardTitle className="text-xl">Admin Login</CardTitle>
              <CardDescription>
                Manage workforce, monitor activity, and access analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login/admin" className="block">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg">
                  Continue as Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}