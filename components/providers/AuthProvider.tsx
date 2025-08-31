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
      
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: "include",
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      } else {
        localStorage.removeItem('access_token')
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      localStorage.removeItem('access_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        const errorMessage = extractErrorMessage(response, errorData)
        const errorDetails = extractErrorDetails(response, errorData)
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      
      await fetchCurrentUser()
    } catch (error) {
      console.error('Login error:', error)
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
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        const errorMessage = extractErrorMessage(response, errorData)
        const errorDetails = extractErrorDetails(response, errorData)
        
        throw new Error(errorMessage)
      }
      
    } catch (error) {
      console.error('Registration error:', error)
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
