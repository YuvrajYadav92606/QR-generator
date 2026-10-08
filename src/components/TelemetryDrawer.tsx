import React from 'react'
import type { TelemetryLog } from '../types/ticket'
import { Terminal, X, Trash2 } from 'lucide-react'

interface TelemetryDrawerProps {
  isOpen: boolean
  onClose: () => void
  logs: TelemetryLog[]
  onClear: () => void
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClear,
}) => {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="telemetry-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col p-6 text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-300" aria-hidden="true" />
            <h2 id="telemetry-drawer-title" className="text-sm font-semibold tracking-wide uppercase font-mono">
              Telemetry Event Stream
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close telemetry logs drawer"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 text-xs text-zinc-400">
          <span>{logs.length} telemetry pings captured</span>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear telemetry event stream"
              className="flex items-center gap-1 hover:text-zinc-200"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-xs pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              No telemetry events recorded yet. Perform actions in the worker to stream telemetry.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px]"
              >
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-zinc-200 font-semibold">{log.action}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-zinc-400 break-all">
                  [Analytics] User interacted with Ticket QR Code Generator Worker: {log.action}
                </div>
                {log.detail && (
                  <pre className="mt-1.5 p-1.5 bg-black/40 rounded text-zinc-400 text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {log.detail}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
