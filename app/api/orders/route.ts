import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Authorization header missing' },
        { status: 401 }
      )
    }
    console.log("AAA", authHeader, searchParams.toString())
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { detail: errorData.detail || 'Failed to get orders' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/orders/`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: "include",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { detail: errorData.detail || 'Failed to create order' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
