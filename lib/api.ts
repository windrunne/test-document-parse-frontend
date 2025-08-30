import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { User, LoginCredentials, RegisterData, AuthResponse } from '@/types/user'
import { extractErrorMessage, extractErrorDetails } from '@/utils/error-handler'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token')
          window.location.href = '/'
        }
        
        // Enhance error with structured error information
        if (error.response?.data) {
          try {
            const errorMessage = extractErrorMessage(
              { status: error.response.status } as Response, 
              error.response.data
            )
            const errorDetails = extractErrorDetails(
              { status: error.response.status } as Response, 
              error.response.data
            )
            
            // Add structured error info to the error object
            error.structuredError = {
              message: errorMessage,
              details: errorDetails
            }
            
            console.log('📋 Structured error details:', errorDetails)
          } catch (parseError) {
            console.error('Error parsing structured error:', parseError)
          }
        }
        
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete this.client.defaults.headers.common['Authorization']
    }
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/login', credentials)
    return response.data
  }

  async register(data: RegisterData): Promise<User> {
    const response = await this.client.post('/api/auth/register', data)
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/api/auth/me')
    return response.data
  }

  // Orders endpoints
  async getOrders(params?: { skip?: number; limit?: number; status_filter?: string; patient_name?: string }) {
    try {
      const response = await this.client.get('/api/orders', { params })
      console.log('📡 Orders API response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Orders API error:', error)
      throw error
    }
  }

  async getOrder(orderId: number) {
    const response = await this.client.get(`/api/orders/${orderId}`)
    return response.data
  }

  async createOrder(orderData: any) {
    try {
      console.log('📤 Creating order with data:', orderData)
      const response = await this.client.post('/api/orders', orderData)
      console.log('✅ Order created successfully:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Order creation failed:', error)
      throw error
    }
  }

  async updateOrder(orderId: number, orderData: any) {
    const response = await this.client.put(`/api/orders/${orderId}`, orderData)
    return response.data
  }

  async deleteOrder(orderId: number) {
    const response = await this.client.delete(`/api/orders/${orderId}`)
    return response.data
  }

  // Documents endpoints
  async getDocuments(params?: { skip?: number; limit?: number; status_filter?: string }) {
    const response = await this.client.get('/api/documents', { params })
    return response.data
  }

  async getDocument(documentId: number) {
    const response = await this.client.get(`/api/documents/${documentId}`)
    return response.data
  }

  async uploadDocument(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post('/api/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async extractDocumentData(documentId: number) {
    const response = await this.client.post(`/api/documents/${documentId}/extract`)
    return response.data
  }

  async deleteDocument(documentId: number) {
    const response = await this.client.delete(`/api/documents/${documentId}`)
    return response.data
  }
}

export const apiClient = new ApiClient()

// Export specific API instances for different modules
export const authApi = {
  login: apiClient.login.bind(apiClient),
  register: apiClient.register.bind(apiClient),
  getCurrentUser: apiClient.getCurrentUser.bind(apiClient),
  setToken: apiClient.setToken.bind(apiClient),
}

export const ordersApi = {
  getOrders: apiClient.getOrders.bind(apiClient),
  getOrder: apiClient.getOrder.bind(apiClient),
  createOrder: apiClient.createOrder.bind(apiClient),
  updateOrder: apiClient.updateOrder.bind(apiClient),
  deleteOrder: apiClient.deleteOrder.bind(apiClient),
}

export const documentsApi = {
  getDocuments: apiClient.getDocuments.bind(apiClient),
  getDocument: apiClient.getDocument.bind(apiClient),
  uploadDocument: apiClient.uploadDocument.bind(apiClient),
  extractDocumentData: apiClient.extractDocumentData.bind(apiClient),
  deleteDocument: apiClient.deleteDocument.bind(apiClient),
}
