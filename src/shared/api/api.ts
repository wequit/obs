import type {
  AuthResponse,
  BookingRequestCreate,
  BookingRequestDto,
  ClubCreateRequest,
  ClubResponse,
  ClubStatus,
  ClubStatusUpdateRequest,
  ClubUpdateRequest,
  LoginRequest,
  PageResponse,
  RegisterRequest,
  ResourceCreateRequest,
  ResourceResponse,
  ResourceStatusUpdateRequest,
  ResourceUpdateRequest,
  UserInfoResponse,
} from '../types/api'
import { http } from './http'

const demoUser: UserInfoResponse = {
  id: 1,
  name: 'Demo Owner',
  email: 'demo@owner.kg',
  phone: '+996 700 11 22 33',
  role: 'OWNER',
}

function wait(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeClubsResponse(data: ClubResponse[] | PageResponse<ClubResponse>): PageResponse<ClubResponse> {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length,
    }
  }
  return data
}

function normalizePage<T>(data: T[] | PageResponse<T>): PageResponse<T> {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length,
    }
  }
  return data
}

function normalizeResourcesList(data: ResourceResponse[] | PageResponse<ResourceResponse>): ResourceResponse[] {
  return normalizePage(data).content
}

export const api = {
  getPublicClubs: async (params?: {
    page?: number
    size?: number
    search?: string
    status?: ClubStatus
  }) => {
    const { page = 0, size = 12, search, status } = params ?? {}
    const response = await http.get<ClubResponse[] | PageResponse<ClubResponse>>('/public/clubs', {
      params: {
        page,
        size,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      },
    })
    return normalizeClubsResponse(response.data)
  },

  getPublicClubById: async (clubId: number) => {
    const response = await http.get<ClubResponse>(`/public/clubs/${clubId}`)
    return response.data
  },

  getOwnerClubById: async (clubId: number) => {
    const response = await http.get<ClubResponse>(`/owner/clubs/${clubId}`)
    return response.data
  },

  getOwnerClubs: async () => {
    const response = await http.get<ClubResponse[] | PageResponse<ClubResponse>>('/owner/clubs')
    const normalized = normalizeClubsResponse(response.data)
    return normalized.content
  },

  createOwnerClub: async (payload: ClubCreateRequest) => {
    const response = await http.post<ClubResponse>('/owner/clubs', payload)
    return response.data
  },

  updateOwnerClub: async (clubId: number, payload: ClubUpdateRequest) => {
    const response = await http.put<ClubResponse>(`/owner/clubs/${clubId}`, payload)
    return response.data
  },

  uploadOwnerClubImages: async (clubId: number, files: File[]) => {
    const formData = new FormData()
    if (files.length > 0) {
      formData.append('logo', files[0])
    }
    files.forEach((file) => formData.append('gallery', file))
    const response = await http.post<ClubResponse>(`/owner/clubs/${clubId}/images`, formData)
    return response.data
  },

  updateOwnerClubStatus: async (clubId: number, status: ClubStatus) => {
    const payload: ClubStatusUpdateRequest = { status }
    const response = await http.patch<ClubResponse>(`/owner/clubs/${clubId}/status`, payload)
    return response.data
  },

  getPublicResourcesByClub: async (clubId: number) => {
    const response = await http.get<ResourceResponse[] | PageResponse<ResourceResponse>>(
      `/public/clubs/${clubId}/resources`,
    )
    return normalizeResourcesList(response.data)
  },

  getPublicResourcesAvailable: async (clubId: number, start: string, end: string) => {
    const response = await http.get<ResourceResponse[] | PageResponse<ResourceResponse>>(
      `/public/clubs/${clubId}/resources/available`,
      {
        params: { start, end },
      },
    )
    return normalizeResourcesList(response.data)
  },

  getPublicResourceSchedule: async (clubId: number, resourceId: number, date: string) => {
    const response = await http.get<unknown>(`/public/clubs/${clubId}/resources/${resourceId}/schedule`, {
      params: { date },
    })
    return response.data
  },

  getOwnerResourcesByClub: async (clubId: number) => {
    const response = await http.get<ResourceResponse[] | PageResponse<ResourceResponse>>(
      `/owner/clubs/${clubId}/resources`,
    )
    return normalizeResourcesList(response.data)
  },

  createOwnerResource: async (clubId: number, payload: ResourceCreateRequest) => {
    const response = await http.post<ResourceResponse>(`/owner/clubs/${clubId}/resources`, payload)
    return response.data
  },

  updateOwnerResource: async (clubId: number, resourceId: number, payload: ResourceUpdateRequest) => {
    const response = await http.put<ResourceResponse>(`/owner/clubs/${clubId}/resources/${resourceId}`, payload)
    return response.data
  },

  deleteOwnerResource: async (clubId: number, resourceId: number) => {
    await http.delete(`/owner/clubs/${clubId}/resources/${resourceId}`)
  },

  updateOwnerResourceStatus: async (clubId: number, resourceId: number, payload: ResourceStatusUpdateRequest) => {
    const response = await http.patch<ResourceResponse>(
      `/owner/clubs/${clubId}/resources/${resourceId}/status`,
      payload,
    )
    return response.data
  },

  createPublicBookingRequest: async (clubId: number, payload: BookingRequestCreate) => {
    const response = await http.post<BookingRequestDto>(`/public/clubs/${clubId}/booking-requests`, payload)
    return response.data
  },

  cancelPublicBookingByToken: async (token: string) => {
    const response = await http.patch<BookingRequestDto>(`/public/booking-requests/cancel/${token}`)
    return response.data
  },

  getOwnerBookings: async (page = 0, size = 20) => {
    const response = await http.get<BookingRequestDto[] | PageResponse<BookingRequestDto>>(
      '/owner/clubs/booking-requests',
      { params: { page, size } },
    )
    return normalizePage(response.data)
  },

  getOwnerBookingsByClub: async (clubId: number, page = 0, size = 20) => {
    const response = await http.get<BookingRequestDto[] | PageResponse<BookingRequestDto>>(
      `/owner/clubs/${clubId}/booking-requests`,
      { params: { page, size } },
    )
    return normalizePage(response.data)
  },

  getOwnerBookingById: async (clubId: number, bookingId: number) => {
    const response = await http.get<BookingRequestDto>(`/owner/clubs/${clubId}/booking-requests/${bookingId}`)
    return response.data
  },

  confirmOwnerBooking: async (clubId: number, bookingId: number) => {
    const response = await http.patch<BookingRequestDto>(
      `/owner/clubs/${clubId}/booking-requests/${bookingId}/confirm`,
    )
    return response.data
  },

  completeOwnerBooking: async (clubId: number, bookingId: number) => {
    const response = await http.patch<BookingRequestDto>(
      `/owner/clubs/${clubId}/booking-requests/${bookingId}/complete`,
    )
    return response.data
  },

  cancelOwnerBooking: async (clubId: number, bookingId: number) => {
    const response = await http.patch<BookingRequestDto>(
      `/owner/clubs/${clubId}/booking-requests/${bookingId}/cancel`,
    )
    return response.data
  },

  loginOwner: async (payload: LoginRequest) => {
    const response = await http.post<AuthResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
      fcmToken: payload.fcmToken ?? '',
    })
    return response.data
  },

  registerOwner: async (payload: RegisterRequest) => {
    const response = await http.post<UserInfoResponse>('/auth/register', payload)
    return response.data
  },

  /** Нет маршрута в опубликованной спецификации — остаётся заглушкой для dev. */
  me: async () => {
    await wait(200)
    return demoUser
  },
}
