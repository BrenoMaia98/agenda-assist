import { ReactNode } from 'react'
import { CalendarProvider } from '../contexts/CalendarContext'

// Mock data for tests
const mockPlayers = [
  { id: 1, name: 'Breno', is_gm: true, user_id: 'test-user-1' },
  { id: 2, name: 'Nalu', is_gm: false, user_id: 'test-user-2' },
  { id: 3, name: 'Yshi', is_gm: false, user_id: 'test-user-3' },
  { id: 4, name: 'Drefon', is_gm: false, user_id: 'test-user-4' },
  { id: 5, name: 'Frizon', is_gm: false, user_id: 'test-user-5' },
  { id: 6, name: 'Tinga', is_gm: false, user_id: 'test-user-6' },
  { id: 7, name: 'Zangs', is_gm: false, user_id: 'test-user-7' },
]

let mockSessionsData: any[] = []

// Mock Supabase client for Cypress
export const createMockSupabaseClient = () => {
  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
  }

  return {
    from: (table: string) => {
      const data = table === 'players' ? mockPlayers : mockSessionsData
      return {
        select: (columns?: string) => {
          const result = {
            eq: (column: string, value: any) =>
              Promise.resolve({
                data: data.filter((item: any) => item[column] === value),
                error: null,
              }),
            order: (column: string) =>
              Promise.resolve({
                data: data,
                error: null,
              }),
          }
          // Return promise directly for select without eq
          return Object.assign(
            Promise.resolve({
              data: data,
              error: null,
            }),
            result
          )
        },
        insert: (insertData: any) => ({
          select: () => {
            const newData = Array.isArray(insertData)
              ? insertData.map((item: any, idx: number) => ({
                  ...item,
                  id: Date.now() + idx,
                  created_at: new Date().toISOString(),
                }))
              : [
                  {
                    ...insertData,
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                  },
                ]

            // Add to mock data
            if (table === 'sessions') {
              mockSessionsData.push(...newData)
            }

            return Promise.resolve({
              data: newData,
              error: null,
            })
          },
        }),
        delete: () => ({
          eq: (column: string, value: any) => {
            // Remove from mock data
            if (table === 'sessions') {
              mockSessionsData = mockSessionsData.filter(
                (item: any) => item[column] !== value
              )
            }
            return Promise.resolve({
              data: null,
              error: null,
            })
          },
        }),
      }
    },
    channel: () => mockChannel,
    removeChannel: () => {},
  } as any
}

export const clearMockSessionsData = () => {
  mockSessionsData = []
}

export const getMockSessionsData = () => mockSessionsData

interface TestWrapperProps {
  children: ReactNode
}

export const TestWrapper = ({ children }: TestWrapperProps) => {
  const mockSupabase = createMockSupabaseClient()

  return (
    <CalendarProvider supabaseClient={mockSupabase}>
      {children}
    </CalendarProvider>
  )
}
