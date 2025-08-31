'use client'

import { useState } from 'react'
import { useMutation } from 'react-query'
import { XIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// API function using fetch
const createOrder = async (orderData: any) => {
  const token = localStorage.getItem('access_token')
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(orderData),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw { response, data: errorData }
  }
  
  return response.json()
}

export function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [formData, setFormData] = useState({
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    order_type: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    status: 'pending'
  })

  const createMutation = useMutation(createOrder, {
    onSuccess: () => {
      toast.success('Order created successfully!')
      onSuccess()
    },
    onError: (error: any) => {
      
      let errorMessage = 'Failed to create order'
      
      if (error.response?.status === 422) {
        const validationErrors = error.data?.detail
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          errorMessage = validationErrors.map((err: any) => 
            `${err.loc?.join('.') || 'field'}: ${err.msg}`
          ).join(', ')
        } else if (typeof validationErrors === 'string') {
          errorMessage = validationErrors
        }
      } else if (error.data?.detail) {
        errorMessage = error.data.detail
      }
      
      toast.error(errorMessage)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const orderData = {
      ...formData,
      unit_price: formData.unit_price,
      total_amount: formData.quantity * formData.unit_price
    }
    
    createMutation.mutate(orderData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unit_price' ? parseFloat(value) || 0 : value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="patient_first_name"
                required
                value={formData.patient_first_name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="patient_last_name"
                required
                value={formData.patient_last_name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              name="patient_dob"
              required
              value={formData.patient_dob}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Type *
            </label>
            <select
              name="order_type"
              required
              value={formData.order_type}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Select order type</option>
              <option value="CPAP">CPAP</option>
              <option value="Oxygen">Oxygen</option>
              <option value="Wheelchair">Wheelchair</option>
              <option value="Hospital Bed">Hospital Bed</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input-field"
              rows={3}
              placeholder="Additional details about the order..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                required
                min="1"
                value={formData.quantity}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price *
              </label>
              <input
                type="number"
                name="unit_price"
                required
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={handleInputChange}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="input-field bg-gray-50">
                ${(formData.quantity * formData.unit_price).toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="btn-primary flex gap-2 items-center"
            >
              {createMutation.isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
