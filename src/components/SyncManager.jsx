import React, { useState, useEffect, useRef } from 'react'
import { Box, Chip, IconButton, Tooltip } from '@mui/material'
import { Wifi, WifiOff, Refresh } from '@mui/icons-material'

// Lightweight throttle helper to prevent rapid-fire syncs
// Ensures at most one sync event per second, avoiding unnecessary re-renders
function throttle(fn, wait = 1000) {
  let lastCalled = 0
  return (...args) => {
    const now = Date.now()
    if (now - lastCalled >= wait) {
      lastCalled = now
      fn(...args)
    }
  }
}

export default function SyncManager() {
  // Track network status so we can display an "Online"/"Offline" indicator
  const [online, setOnline] = useState(navigator.onLine)
  // Used to show the last time the data was synced
  const [lastSync, setLastSync] = useState(Date.now())
  // BroadcastChannel reference for cross-tab communication
  const bcRef = useRef(null)

  // Set up BroadcastChannel and online/offline event listeners once on mount
  useEffect(() => {
    bcRef.current = new BroadcastChannel('patient-sync') 

    const handleOnline = () => setOnline(true)   
    const handleOffline = () => setOnline(false) 

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      bcRef.current?.close()                     // Clean up channel on unmount
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Throttled function to broadcast a "patient-updated" message
  // Prevents multiple rapid clicks from flooding other tabs with sync events
  const handleRefresh = throttle(() => {
    bcRef.current?.postMessage({ type: 'patient-updated' })
    setLastSync(Date.now()) 
  }, 1000) 

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
      {/* Button to force a broadcast so other tabs reload data immediately */}
      <Tooltip title="Force sync">
        <IconButton onClick={handleRefresh} size="small">
          <Refresh fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Green/Amber indicator showing current online/offline state */}
      <Chip
        icon={online ? <Wifi /> : <WifiOff />}
        label={online ? 'Online' : 'Offline'}
        size="small"
        color={online ? 'success' : 'warning'}
      />

      {/* Show the time of the most recent sync action */}
      <Chip
        label={`Synced ${new Date(lastSync).toLocaleTimeString()}`}
        size="small"
        variant="outlined"
      />
    </Box>
  )
}



