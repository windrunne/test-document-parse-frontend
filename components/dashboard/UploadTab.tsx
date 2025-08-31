'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from 'react-query'
import { UploadIcon, FileIcon, CheckIcon, XIcon, AlertCircleIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface UploadedFile {
  id: string
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  result?: any
  error?: string
}

// API functions using fetch
const uploadDocument = async (file: File) => {
  const token = localStorage.getItem('access_token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
    credentials: "include",
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw { response, data: errorData }
  }
  
  return response.json()
}

const extractDocumentData = async (documentId: number) => {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`/api/documents/${documentId}/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: "include",
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw { response, data: errorData }
  }
  
  return response.json()
}

export function UploadTab() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const queryClient = useQueryClient()

  const uploadMutation = useMutation(uploadDocument, {
    onSuccess: (data, file) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'processing', result: data }
            : f
        )
      )
      toast.success('Document uploaded successfully! AI processing started.')
      queryClient.invalidateQueries(['documents'])
    },
    onError: (error: any, file) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error', error: error.data?.detail || 'Upload failed' }
            : f
        )
      )
      toast.error('Document upload failed')
    },
  })

  const extractMutation = useMutation(extractDocumentData, {
    onSuccess: (data, documentId) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.result?.id === documentId 
            ? { ...f, status: 'completed', result: { ...f.result, ...data } }
            : f
        )
      )
      toast.success('Data extraction completed!')
      queryClient.invalidateQueries(['documents'])
    },
    onError: (error: any, documentId) => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.result?.id === documentId 
            ? { ...f, status: 'error', error: error.data?.detail || 'Extraction failed' }
            : f
        )
      )
      toast.error('Data extraction failed')
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'uploading' as const,
      progress: 0,
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    newFiles.forEach(fileInfo => {
      const interval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileInfo.id 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        )
      }, 100)

      uploadMutation.mutate(fileInfo.file, {
        onSuccess: () => {
          clearInterval(interval)
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileInfo.id 
                ? { ...f, progress: 100 }
                : f
            )
          )
        },
        onError: () => {
          clearInterval(interval)
        }
      })
    })
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.bmp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const handleExtractData = (fileInfo: UploadedFile) => {
    if (fileInfo.result?.id) {
      extractMutation.mutate(fileInfo.result.id)
    }
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <LoadingSpinner size="sm" />
      case 'processing':
        return <LoadingSpinner size="sm" />
      case 'completed':
        return <CheckIcon className="w-5 h-5 text-green-600" />
      case 'error':
        return <XIcon className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600'
      case 'processing':
        return 'text-yellow-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Document Upload</h2>
        <p className="text-gray-600 mt-1">
          Upload medical documents for AI-powered patient data extraction
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-gray-500 mt-1">
            or click to select files
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Supports PDF, JPEG, PNG, TIFF, BMP (max 10MB)
          </p>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
          
          {uploadedFiles.map((fileInfo) => (
            <div
              key={fileInfo.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileIcon className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{fileInfo.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getStatusColor(fileInfo.status)}`}>
                    {fileInfo.status.charAt(0).toUpperCase() + fileInfo.status.slice(1)}
                  </span>
                  {getStatusIcon(fileInfo.status)}
                </div>
              </div>

              {fileInfo.status === 'uploading' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileInfo.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{fileInfo.progress}% uploaded</p>
                </div>
              )}

              {fileInfo.status === 'completed' && fileInfo.result?.extracted_data && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">Extracted Patient Data:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">First Name:</span>
                      <span className="ml-2 text-green-700">
                        {fileInfo.result.extracted_data.patient_first_name || 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Last Name:</span>
                      <span className="ml-2 text-green-700">
                        {fileInfo.result.extracted_data.patient_last_name || 'Not found'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Date of Birth:</span>
                      <span className="ml-2 text-green-700">
                        {fileInfo.result.extracted_data.patient_dob || 'Not found'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {fileInfo.status === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{fileInfo.error}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  {fileInfo.status === 'processing' && (
                    <button
                      onClick={() => handleExtractData(fileInfo)}
                      disabled={extractMutation.isLoading}
                      className="btn-primary text-sm"
                    >
                      {extractMutation.isLoading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : null}
                      Extract Data
                    </button>
                  )}
                </div>

                <button
                  onClick={() => removeFile(fileInfo.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove file"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
