export type ClubStatus = 'ACTIVE' | 'INACTIVE'
export type BookingStatus = 'NEW' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED'
export type ResourceType = 'BILLIARD' | 'TABLE_TENNIS' | 'PLAYSTATION' | 'VIP_ROOM'
export type ResourceStatus = 'AVAILABLE' | 'OUT_OF_SERVICE' | 'HIDDEN'

export interface ApiLocalTime {
  hour: number
  minute: number
  second: number
  nano: number
}

export interface ClubWorkingHoursResponse {
  dayOfWeek: number
  openTime: ApiLocalTime
  closeTime: ApiLocalTime
  isClosed: boolean
}

export interface ClubWorkingHoursRequest {
  dayOfWeek: number
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
}

export interface ClubGalleryItem {
  id?: number
  galleryUrl?: string
  thumbGalleryUrl?: string
}

export interface ClubResponse {
  id: number
  ownerId: number
  name: string
  description?: string
  address: string
  phone: string
  logo?: string
  gallery?: (string | ClubGalleryItem)[]
  workingHours?: ClubWorkingHoursResponse[]
  status: ClubStatus
}

export interface ClubCreateRequest {
  name: string
  description?: string
  address: string
  phone: string
  logo?: string
  gallery?: string[]
  workingHours?: ClubWorkingHoursRequest[]
}

export interface ClubUpdateRequest extends ClubCreateRequest {}

export interface ClubStatusUpdateRequest {
  status: ClubStatus
}

export interface ResourceResponse {
  id: number
  clubId: number
  name: string
  number: number
  type: ResourceType
  status: ResourceStatus
  pricePerHour?: number
  description?: string
}

export interface ResourceCreateRequest {
  name: string
  number: number
  type: ResourceType
  status?: ResourceStatus
  pricePerHour?: number
  description?: string
}

export interface ResourceUpdateRequest {
  name: string
  number: number
  type: ResourceType
  pricePerHour?: number
  description?: string
}

export interface ResourceStatusUpdateRequest {
  status: ResourceStatus
}

export interface BookingRequestCreate {
  customerName: string
  customerPhone: string
  resourceId: number
  startTime: string
  endTime: string
  comment?: string
  fcmToken?: string
  deviceType?: string
}

export interface BookingRequestDto extends BookingRequestCreate {
  id: number
  clubId: number
  status: BookingStatus
  cancelToken?: string
}

export interface UserInfoResponse {
  id: number
  name: string
  email: string
  phone: string
  role: 'OWNER' | 'CLIENT'
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: UserInfoResponse
}

export interface LoginRequest {
  email: string
  password: string
  fcmToken?: string
}

export interface RegisterRequest {
  name: string
  email: string
  phone: string
  password: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
