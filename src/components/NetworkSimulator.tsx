import React from 'react'
import type { NetworkMode } from '../types/ticket'
import { Wifi, WifiOff, Activity } from 'lucide-react'

interface NetworkSimulatorProps {
  currentMode: NetworkMode
  onModeChange: (mode: NetworkMode) => void
  pendingOfflineCount: number
}

export const NetworkSimulator: React.FC<NetworkSimulatorProps> = ({
  currentMode,
  onModeChange,
  pendingOfflineCount,
}) => {
  return (
    <section
      aria-label="Network Connectivity Simulator"
      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-8 text-zinc-200"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 border border-zinc-700 rounded">
            {currentMode === 'ONLINE' && <Wifi className="w-5 h-5 text-zinc-100" aria-hidden="true" />}
            {currentMode === 'SLOW_3G' && <Activity className="w-5 h-5 text-zinc-300 animate-pulse" aria-hidden="true" />}
            {currentMode === 'OFFLINE' && <WifiOff className="w-5 h-5 text-zinc-400" aria-hidden="true" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">Network Simulation</span>
              {currentMode === 'ONLINE' && (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-100">
                  Online (High-Speed)
                </span>
              )}
              {currentMode === 'SLOW_3G' && (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-600 font-mono text-zinc-200">
                  Slow 3G Active (~1.5s latency)
                </span>
              )}
              {currentMode === 'OFFLINE' && (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-600 font-mono text-zinc-300">
                  Offline Mode (Local Cache)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Floor staff field resilience: Test generator performance under harsh network conditions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingOfflineCount > 0 && (
            <span className="text-xs font-mono bg-zinc-800 text-zinc-200 px-2 py-1 rounded border border-zinc-700">
              {pendingOfflineCount} queued offline
            </span>
          )}
          <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-0.5" role="group" aria-label="Network mode switch">
            <button
              type="button"
              onClick={() => onModeChange('ONLINE')}
              aria-pressed={currentMode === 'ONLINE'}
              aria-label="Simulate Online"
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                currentMode === 'ONLINE'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => onModeChange('SLOW_3G')}
              aria-pressed={currentMode === 'SLOW_3G'}
              aria-label="Simulate Slow 3G"
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                currentMode === 'SLOW_3G'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Slow 3G
            </button>
            <button
              type="button"
              onClick={() => onModeChange('OFFLINE')}
              aria-pressed={currentMode === 'OFFLINE'}
              aria-label="Simulate Offline"
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                currentMode === 'OFFLINE'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Offline
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
