export type TicketType = 'General' | 'VIP' | 'Staff' | 'Contractor'
export type TicketStatus = 'Issued' | 'Validated' | 'Revoked'
export type NetworkMode = 'ONLINE' | 'SLOW_3G' | 'OFFLINE'

export interface Ticket {
  id: string
  ticketNumber: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string
  ticketType: TicketType
  status: TicketStatus
  notes?: string
  issuedAt: string
  qrPayload: string
  qrDataUrl: string
  isOfflineCreated: boolean
}

export interface TicketFormData {
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  ticketType: TicketType
  notes: string
}

export interface FormErrors {
  attendeeName?: string
  attendeeEmail?: string
  attendeePhone?: string
  ticketType?: string
}

export interface TelemetryLog {
  id: string
  timestamp: string
  action: string
  detail: string
}
