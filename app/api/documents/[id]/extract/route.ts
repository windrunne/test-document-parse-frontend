import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/documents/${params.id}/extract`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      credentials: "include",
      signal: AbortSignal.timeout(900000),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { detail: errorData.detail || 'Failed to extract document data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Extract document error:', error)
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Request timeout - document processing is taking too long. Please try again.' },
        { status: 408 }
      )
    }
    
    if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('other side closed')) {
      console.error('Connection error details:', {
        code: error.code,
        message: error.message,
        cause: error.cause
      })
      
      return NextResponse.json(
        { 
          detail: 'Connection lost during document processing. The backend may have completed successfully. Please check the documents list.',
          error_type: 'connection_lost',
          suggestion: 'Check if the document was processed successfully in the documents list'
        },
        { status: 503 }
      )
    }
    
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      return NextResponse.json(
        { 
          detail: 'Network error during document processing. Please check your connection and try again.',
          error_type: 'network_error'
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        detail: 'Internal server error during document processing',
        error_type: 'unknown_error'
      },
      { status: 500 }
    )
  }
}
