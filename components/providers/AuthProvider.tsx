'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types/user'
import { extractErrorMessage, extractErrorDetails } from '@/utils/error-handler'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('access_token')
      console.log('🔍 Checking for token:', token ? 'Token found' : 'No token')
      
      if (!token) {
        console.log('❌ No token found, setting user to null')
        setUser(null)
        setLoading(false)
        return
      }

      console.log('🔐 Making request to /api/auth/me with token')
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      console.log('📡 /api/auth/me response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ User data received:', data)
        setUser(data)
      } else {
        console.log('❌ /api/auth/me failed, removing token')
        localStorage.removeItem('access_token')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Failed to fetch current user:', error)
      localStorage.removeItem('access_token')
      setUser(null)
    } finally {
      console.log('🏁 Setting loading to false')
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', username)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('❌ Login error response:', errorData)
        
        const errorMessage = extractErrorMessage(response, errorData)
        const errorDetails = extractErrorDetails(response, errorData)
        
        console.log('📋 Error details:', errorDetails)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('✅ Login response:', data)
      
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
        console.log('💾 Token stored in localStorage')
      }
      
      console.log('👤 Fetching current user...')
      await fetchCurrentUser()
      console.log('✅ User fetch completed')
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      localStorage.removeItem('access_token')
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('access_token')
      setUser(null)
    }
  }

  const register = async (email: string, username: string, password: string) => {
    try {
      console.log('📝 Attempting registration for:', username, email)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('❌ Registration error response:', errorData)
        
        const errorMessage = extractErrorMessage(response, errorData)
        const errorDetails = extractErrorDetails(response, errorData)
        
        console.log('📋 Error details:', errorDetails)
        throw new Error(errorMessage)
      }
      
      console.log('✅ Registration successful')
    } catch (error) {
      console.error('❌ Registration error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
