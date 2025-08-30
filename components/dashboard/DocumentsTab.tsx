'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { documentsApi } from '@/lib/api'
import { File, Trash2, RefreshCw, Eye } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface Document {
  id: number
  original_filename: string
  file_size: number
  content_type: string
  patient_first_name?: string
  patient_last_name?: string
  patient_dob?: string
  extraction_status: string
  created_at: string
}

export function DocumentsTab() {
  const [filters, setFilters] = useState({
    status: '',
  })
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [isExtracting, setIsExtracting] = useState<number | null>(null)
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null)

  const queryClient = useQueryClient()

  const { data: documentsData, isLoading, error } = useQuery(
    ['documents', filters],
    () => documentsApi.getDocuments({ status_filter: filters.status }),
    {
      keepPreviousData: true,
      retry: false,
      onError: (error) => {
        console.error('❌ Documents query error:', error)
      },
      onSuccess: (data) => {
        console.log('✅ Documents query success:', data)
      }
    }
  )

  const documents = documentsData?.items || []

  const deleteMutation = useMutation(documentsApi.deleteDocument, {
    onSuccess: () => {
      queryClient.invalidateQueries(['documents'])
      toast.success('Document deleted successfully')
    },
    onError: (error: any) => {
      const errorMessage = error.structuredError?.message || 
                          error.response?.data?.detail || 
                          'Failed to delete document'
      toast.error(errorMessage)
    },
  })

  const extractMutation = useMutation(documentsApi.extractDocumentData, {
    onSuccess: () => {
      queryClient.invalidateQueries(['documents'])
      toast.success('Data extraction completed')
    },
                    onError: (error: any) => {
                  const errorMessage = error.structuredError?.message || 
                                      error.response?.data?.detail || 
                                      'Failed to extract data'
                  
                  const errorData = error.response?.data
                  const errorType = errorData?.error_type
                  
                  console.error('Document extraction error:', {
                    message: errorMessage,
                    type: errorType,
                    status: error.response?.status,
                    fullError: error,
                    structuredError: error.structuredError
                  })
                  
                  if (errorType === 'connection_lost') {
                    toast.error('Connection lost during processing. Check if the document was processed successfully.')
                    queryClient.invalidateQueries(['documents'])
                  } else if (errorType === 'network_error') {
                    toast.error('Network error. Please check your connection and try again.')
                  } else if (errorMessage.includes('timeout') || errorMessage.includes('too long')) {
                    toast.error('Document processing is taking too long. Please try again in a few minutes.')
                  } else {
                    toast.error(errorMessage)
                  }
                },
  })

  useEffect(() => {
    if (deleteMutation.isSuccess || deleteMutation.isError) {
      setIsDeleting(null)
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError])

  useEffect(() => {
    if (extractMutation.isSuccess || extractMutation.isError) {
      setIsExtracting(null)
    }
  }, [extractMutation.isSuccess, extractMutation.isError])

  const handleDelete = async (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.original_filename}"?`)) {
      setIsDeleting(document.id)
      deleteMutation.mutate(document.id)
    }
  }

  const handleViewDocument = (document: Document) => {
    setViewingDocument(document)
  }

  const handleExtract = async (documentId: number) => {
    setIsExtracting(documentId)
    extractMutation.mutate(documentId)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    console.error('❌ Documents error object:', error)
    const errorMessage = typeof error === 'string' ? error : 
      (error as any)?.message || (error as any)?.detail || 'Error loading documents. Please try again.'
    return (
      <div className="text-center text-red-600">
        {errorMessage}
      </div>
    )
  }



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <div className="text-sm text-gray-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extraction Status
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
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((document: Document) => (
          <div
            key={document.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <File className="w-8 h-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={document.original_filename}>
                    {document.original_filename}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(document.file_size)}</p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.extraction_status)}`}>
                {document.extraction_status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Type:</span> {document.content_type}
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-medium">Uploaded:</span> {new Date(document.created_at).toLocaleDateString()}
              </div>
            </div>

            {document.extraction_status === 'completed' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="text-xs font-medium text-green-800 mb-2">Extracted Data:</h4>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="font-medium text-green-700">Name:</span>
                    <span className="ml-2 text-green-600">
                      {document.patient_first_name} {document.patient_last_name}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">DOB:</span>
                    <span className="ml-2 text-green-600">{document.patient_dob}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                                 {document.extraction_status === 'pending' && (
                   <button
                     onClick={() => handleExtract(document.id)}
                     disabled={isExtracting === document.id}
                     className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                     title="Extract data"
                   >
                     <RefreshCw className={`w-4 h-4 ${isExtracting === document.id ? 'animate-spin' : ''}`} />
                   </button>
                 )}
                <button
                  onClick={() => handleViewDocument(document)}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  title="View document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

                             <button
                 onClick={() => handleDelete(document)}
                 disabled={isDeleting === document.id}
                 className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                 title="Delete document"
               >
                 <Trash2 className={`w-4 h-4 ${isDeleting === document.id ? 'animate-pulse' : ''}`} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
                          <File className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a document in the Upload tab.
          </p>
        </div>
      )}

      {documentsData && documentsData.pages > 1 && (
        <div className="flex justify-center">
          <nav className="flex items-center space-x-2">
          </nav>
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingDocument.original_filename}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(viewingDocument.file_size)} • {viewingDocument.content_type}
                </p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Document Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Upload Date:</span>
                      <span className="ml-2">{new Date(viewingDocument.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingDocument.extraction_status)}`}>
                        {viewingDocument.extraction_status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">File Size:</span>
                      <span className="ml-2">{formatFileSize(viewingDocument.file_size)}</span>
                    </div>
                  </div>
                </div>

                {viewingDocument.extraction_status === 'completed' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Patient Data</h4>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-green-700">First Name:</span>
                          <span className="ml-2 text-green-600">{viewingDocument.patient_first_name || 'Not Found'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Last Name:</span>
                          <span className="ml-2 text-green-600">{viewingDocument.patient_last_name || 'Not Found'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-green-700">Date of Birth:</span>
                          <span className="ml-2 text-green-600">{viewingDocument.patient_dob || 'Not Found'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {viewingDocument.extraction_status === 'failed' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Extraction Status</h4>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">
                        Data extraction failed. You can try extracting again using the refresh button.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                {viewingDocument.extraction_status === 'pending' && (
                  <button
                    onClick={() => {
                      handleExtract(viewingDocument.id)
                      setViewingDocument(null)
                    }}
                    disabled={isExtracting === viewingDocument.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExtracting === viewingDocument.id ? 'Processing...' : 'Extract Data'}
                  </button>
                )}
                <button
                  onClick={() => setViewingDocument(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
