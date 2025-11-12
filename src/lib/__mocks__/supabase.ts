import { vi } from 'vitest'

// Mock Supabase response data
let mockSessionsData: any[] = []
let mockPlayersData: any[] = []
let mockError: any = null
const mockChannelCallbacks: Map<string, Function> = new Map()

// Mock channel object
const mockChannel = {
  on: vi.fn((event: string, filter: any, callback: Function) => {
    mockChannelCallbacks.set('postgres_changes', callback)
    return mockChannel
  }),
  subscribe: vi.fn(() => mockChannel),
}

// Mock Supabase client
export const supabase = {
  from: vi.fn((table: string) => {
    const data = table === 'players' ? mockPlayersData : mockSessionsData
    return {
      select: vi.fn((columns?: string) => {
        const result = {
          eq: vi.fn((column: string, value: any) =>
            Promise.resolve({
              data: data.filter((s: any) => s[column] === value),
              error: mockError,
            })
          ),
          order: vi.fn((column: string) =>
            Promise.resolve({
              data: data,
              error: mockError,
            })
          ),
        }
        // Return promise directly for select without eq
        return Object.assign(
          Promise.resolve({
            data: data,
            error: mockError,
          }),
          result
        )
      }),
      insert: vi.fn((data: any) => ({
        select: vi.fn(() =>
          Promise.resolve({
            data: Array.isArray(data)
              ? data.map((item: any, idx: number) => ({
                  ...item,
                  id: `test-id-${Date.now()}-${idx}`,
                  created_at: new Date().toISOString(),
                }))
              : [
                  {
                    ...data,
                    id: `test-id-${Date.now()}`,
                    created_at: new Date().toISOString(),
                  },
                ],
            error: mockError,
          })
        ),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((column: string, value: any) =>
          Promise.resolve({
            data: null,
            error: mockError,
          })
        ),
      })),
    }
  }),
  channel: vi.fn((name: string) => mockChannel),
  removeChannel: vi.fn((channel: any) => {}),
}

// Helper functions for tests
export const setMockSessionsData = (data: any[]) => {
  mockSessionsData = data
}

export const setMockPlayersData = (data: any[]) => {
  mockPlayersData = data
}

export const setMockError = (error: any) => {
  mockError = error
}

export const clearMockData = () => {
  mockSessionsData = []
  mockPlayersData = []
  mockError = null
  mockChannelCallbacks.clear()
}

export const triggerRealtimeUpdate = () => {
  const callback = mockChannelCallbacks.get('postgres_changes')
  if (callback) {
    callback()
  }
}

export const getMockChannel = () => mockChannel
