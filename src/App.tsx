import React, { useState, useEffect } from 'react'
import type { Ticket, TicketFormData, NetworkMode, TelemetryLog } from './types/ticket'
import { TicketForm } from './components/TicketForm'
import { TicketList } from './components/TicketList'
import { NetworkSimulator } from './components/NetworkSimulator'
import { TelemetryDrawer } from './components/TelemetryDrawer'
import { generateTicketQRCode } from './utils/qr'
import { logTelemetry, getStoredTelemetryLogs } from './utils/telemetry'
import { Building2, Terminal } from 'lucide-react'

const STORAGE_KEY_TICKETS = 'enterprise_worker_tickets_v1'

export const App: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TICKETS)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [networkMode, setNetworkMode] = useState<NetworkMode>('ONLINE')
  const [isGenerating, setIsGenerating] = useState(false)
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLog[]>(() => getStoredTelemetryLogs())
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false)

  // Save tickets to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets))
    } catch {
      // ignore in memory restricted environments
    }
  }, [tickets])

  const handleModeChange = (mode: NetworkMode) => {
    setNetworkMode(mode)
    const log = logTelemetry('SIMULATE_NETWORK_CHANGE', { newMode: mode })
    setTelemetryLogs((prev) => [log, ...prev])
  }

  const handleGenerateTicket = async (data: TicketFormData) => {
    setIsGenerating(true)

    // Simulate network delay if in Slow 3G mode to verify loading indicator
    if (networkMode === 'SLOW_3G') {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } else {
      // Natural micro-delay for async crypto and rendering
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const issuedAt = new Date().toISOString()

    // Cryptographic-ready structured payload
    const qrPayload = JSON.stringify({
      t: ticketNumber,
      n: data.attendeeName,
      e: data.attendeeEmail,
      type: data.ticketType,
      ts: issuedAt,
      h: Math.random().toString(36).substring(2, 10),
    })

    const qrDataUrl = await generateTicketQRCode(qrPayload)

    const newTicket: Ticket = {
      id: `tck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber,
      attendeeName: data.attendeeName,
      attendeeEmail: data.attendeeEmail,
      attendeePhone: data.attendeePhone || undefined,
      ticketType: data.ticketType,
      status: 'Issued',
      notes: data.notes || undefined,
      issuedAt,
      qrPayload,
      qrDataUrl,
      isOfflineCreated: networkMode === 'OFFLINE',
    }

    setTickets((prev) => [newTicket, ...prev])
    setIsGenerating(false)

    // Telemetry NFR simulation
    const log = logTelemetry('GENERATE_TICKET', {
      ticketNumber,
      tier: data.ticketType,
      isOffline: networkMode === 'OFFLINE',
    })
    setTelemetryLogs((prev) => [log, ...prev])
  }

  const handleVerifyTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'Validated' } : t))
    )
    const target = tickets.find((t) => t.id === ticketId)
    const log = logTelemetry('VERIFY_TICKET', {
      ticketId,
      ticketNumber: target?.ticketNumber,
    })
    setTelemetryLogs((prev) => [log, ...prev])
  }

  const handleRevokeTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'Revoked' } : t))
    )
    const target = tickets.find((t) => t.id === ticketId)
    const log = logTelemetry('REVOKE_TICKET', {
      ticketId,
      ticketNumber: target?.ticketNumber,
    })
    setTelemetryLogs((prev) => [log, ...prev])
  }

  const handlePrintTicket = (ticket: Ticket) => {
    const log = logTelemetry('PRINT_TICKET', { ticketNumber: ticket.ticketNumber })
    setTelemetryLogs((prev) => [log, ...prev])
    window.print()
  }

  const offlineCount = tickets.filter((t) => t.isOfflineCreated).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Corporate Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-100 m-0">
                Ticket QR Code Generator Worker
              </h1>
              <p className="text-xs text-zinc-400 font-mono m-0">
                Floor Terminal &bull; Worker: STF-8492 &bull; Gate 1 Admissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTelemetryDrawerOpen(true)}
              aria-label="View Telemetry Pings Stream"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Telemetry ({telemetryLogs.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Network Resilience Bar */}
        <NetworkSimulator
          currentMode={networkMode}
          onModeChange={handleModeChange}
          pendingOfflineCount={offlineCount}
        />

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <TicketForm onSubmit={handleGenerateTicket} isLoading={isGenerating} />
          </div>

          <div className="lg:col-span-7">
            <TicketList
              tickets={tickets}
              onVerifyTicket={handleVerifyTicket}
              onRevokeTicket={handleRevokeTicket}
              onPrintTicket={handlePrintTicket}
            />
          </div>
        </div>
      </main>

      {/* Corporate Monochromatic Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-400">
        <p>Enterprise Admissions Infrastructure &bull; Zero Rogue Hex Corporate Monochromatic Design System</p>
      </footer>

      {/* Telemetry Stream Drawer */}
      <TelemetryDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        logs={telemetryLogs}
        onClear={() => {
          setTelemetryLogs([])
          localStorage.removeItem('enterprise_ticket_telemetry_logs')
        }}
      />
    </div>
  )
}

export default App
