'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { PlusIcon, EditIcon, TrashIcon, EyeIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { CreateOrderModal } from '@/components/dashboard/CreateOrderModal'
import { EditOrderModal } from '@/components/dashboard/EditOrderModal'
import { OrderDetailsModal } from '@/components/dashboard/OrderDetailsModal'

interface Order {
  id: number
  order_number: string
  patient_first_name: string
  patient_last_name: string
  patient_dob: string
  status: string
  order_type: string
  description?: string
  quantity: number
  unit_price: number
  total_amount: number
  created_at: string
}

// API functions using fetch
const getOrders = async (params?: { skip?: number; limit?: number; status_filter?: string; patient_name?: string }) => {
  const token = localStorage.getItem('access_token')
  const queryParams = new URLSearchParams()
  
  if (params?.skip) queryParams.append('skip', params.skip.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.status_filter) queryParams.append('status_filter', params.status_filter)
  if (params?.patient_name) queryParams.append('patient_name', params.patient_name)
  
  const response = await fetch(`/api/orders?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: "include",
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }
  
  return response.json()
}

const deleteOrder = async (orderId: number) => {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`/api/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: "include",
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete order')
  }
  
  return response.json()
}

export function OrdersTab() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    patient_name: '',
  })

  const queryClient = useQueryClient()

  const { data: ordersData, isLoading, error } = useQuery(
    ['orders', filters],
    () => getOrders(filters),
    {
      keepPreviousData: true,
      retry: false,
      onError: (error) => {
        console.error('❌ Orders query error:', error)
      },
      onSuccess: (data) => {
        console.log('✅ Orders query success:', data)
      }
    }
  )

  const deleteMutation = useMutation(deleteOrder, {
    onSuccess: () => {
      queryClient.invalidateQueries(['orders'])
      toast.success('Order deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete order')
    },
  })

  const handleDelete = (order: Order) => {
    if (window.confirm(`Are you sure you want to delete order ${order.order_number}?`)) {
      deleteMutation.mutate(order.id)
    }
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order)
    setShowEditModal(true)
  }

  const handleView = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    console.error('❌ Orders error object:', error)
    const errorMessage = typeof error === 'string' ? error : 
      (error as any)?.message || (error as any)?.detail || 'Error loading orders. Please try again.'
    return (
      <div className="text-center text-red-600">
        {errorMessage}
      </div>
    )
  }

  const orders = ordersData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Order</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Name
            </label>
            <input
              type="text"
              placeholder="Search by patient name..."
              value={filters.patient_name}
              onChange={(e) => setFilters({ ...filters, patient_name: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order: Order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.patient_first_name} {order.patient_last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.order_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleView(order)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Order"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(order)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Order"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found. Create your first order to get started.</p>
          </div>
        )}
      </div>

      {ordersData && ordersData.pages > 1 && (
        <div className="flex justify-center">
          <nav className="flex items-center space-x-2">
          </nav>
        </div>
      )}
    
      {showCreateModal && (
        <CreateOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries(['orders'])
          }}
        />
      )}

      {showEditModal && selectedOrder && (
        <EditOrderModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          order={selectedOrder}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedOrder(null)
            queryClient.invalidateQueries(['orders'])
          }}
        />
      )}

      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          order={selectedOrder}
        />
      )}
    </div>
  )
}
