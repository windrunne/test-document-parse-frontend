import { NextRequest } from 'next/server'

const HOST_OPTIONS = [
  'http://127.0.0.1:8000',
  'http://localhost:8000',
  'http://0.0.0.0:8000'
]

export class SmartApiClient {
  private baseUrl: string | null = null

  async getBaseUrl(): Promise<string> {
    if (this.baseUrl) {
      return this.baseUrl
    }

    for (const host of HOST_OPTIONS) {
      try {
        const response = await fetch(`${host}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        })
        
        if (response.ok) {
          this.baseUrl = host
          console.log(`✅ Backend found at: ${host}`)
          return host
        }
      } catch (error) {
        console.log(`❌ Failed to connect to: ${host}`)
        continue
      }
    }

    this.baseUrl = HOST_OPTIONS[0]
    console.log(`⚠️  Using fallback backend URL: ${this.baseUrl}`)
    return this.baseUrl
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = await this.getBaseUrl()
    const url = `${baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000)
      })
      return response
    } catch (error) {
      console.error(`❌ API request failed to ${url}:`, error)
      throw error
    }
  }
}

export const smartApiClient = new SmartApiClient()
