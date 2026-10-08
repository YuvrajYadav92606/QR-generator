import type { TelemetryLog } from '../types/ticket'

const TELEMETRY_STORAGE_KEY = 'enterprise_ticket_telemetry_logs'

/**
 * Logs a simulated analytics ping to console and maintains an in-memory buffer.
 * Required format: [Analytics] User interacted with Ticket QR Code Generator Worker: <ACTION>
 */
export function logTelemetry(action: string, metadata?: Record<string, unknown>): TelemetryLog {
  const logEntry: TelemetryLog = {
    id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    detail: metadata ? JSON.stringify(metadata) : '',
  }

  // Mandatory console logging required by TRD
  console.log(
    `[Analytics] User interacted with Ticket QR Code Generator Worker: ${action}`,
    metadata || {}
  )

  // Persist locally for audit/worker inspection
  try {
    const existing = getStoredTelemetryLogs()
    const updated = [logEntry, ...existing].slice(0, 50)
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage quota errors in test/restricted environments
  }

  return logEntry
}

export function getStoredTelemetryLogs(): TelemetryLog[] {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
