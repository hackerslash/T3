'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Clock, Shield, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authAPI } from '@/lib/api'
import Cookies from 'js-cookie'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await authAPI.login(email, password)
      const { token, user } = response.data

      // Verify admin role
      if (user.role !== 'admin') {
        setError('Access denied. Admin privileges required.')
        return
      }

      // Store auth data
      Cookies.set('auth_token', token, { expires: 7 })
      Cookies.set('user_type', 'admin', { expires: 7 })
      Cookies.set('user_data', JSON.stringify(user), { expires: 7 })

      // Redirect to admin dashboard
      router.push('/dashboard/admin')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
          <p className="text-gray-600">Access the management dashboard</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Administrator Access</CardTitle>
            <CardDescription className="text-center">
              Secure login for workforce management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Admin Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Access Dashboard'
                )}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700 text-center">
                <Shield className="inline h-3 w-3 mr-1" />
                Secure admin access with enhanced monitoring
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors block">
            ← Choose Different Login Type
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors block">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}