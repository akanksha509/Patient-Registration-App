import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { getDb } from '../db'

// Create context so any component can access database methods & state
const DatabaseContext = createContext(null)
export const useDatabaseContext = () => useContext(DatabaseContext)

export function DatabaseProvider({ children }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  
  const lastUpdateRef = useRef(Date.now())
  const bcRef = useRef(null)
  const pollIntervalRef = useRef(null)

  // Load all patients from DB, ordered by newest first
  const loadPatients = useCallback(async () => {
    try {
      const db = await getDb()
      const res = await db.query(
        'SELECT * FROM patients ORDER BY created_at DESC'
      )
      setPatients(res.rows) // Update state with newest data
    } catch (e) {
      setError(e.message) // Surface any DB errors
    }
  }, [])

  //Handle incoming BroadcastChannel messages to reload data
  const handleSyncMessage = useCallback(
    (event) => {
      if (event.data?.type === 'patient-updated') {
        console.log('[sync] reload via BroadcastChannel')
        loadPatients() // Refresh list when another tab notifies
      }
    },
    [loadPatients]
  )

  //Poll localStorage for changes as a fallback
  const checkForUpdates = useCallback(() => {
    const lastUpdate = localStorage.getItem('patient-db-lastUpdate')
    if (lastUpdate && parseInt(lastUpdate) > lastUpdateRef.current) {
      console.log('[sync] reload via localStorage polling')
      lastUpdateRef.current = parseInt(lastUpdate)
      loadPatients() // Refresh when timestamp in localStorage is newer
    }
  }, [loadPatients])

    /* 
    Notify other tabs that data has changed
    Sets a localStorage key and posts a BroadcastChannel message
  */
    const notifyTabs = useCallback(() => {
    const now = Date.now()
    lastUpdateRef.current = now
    localStorage.setItem('patient-db-lastUpdate', now.toString())

    try {
      bcRef.current?.postMessage({ type: 'patient-updated' })
      // Other tabs listening will reload their data
    } catch (e) {
      console.warn('BroadcastChannel postMessage failed', e)
    }
  }, [])

  //Set up BroadcastChannel + polling when component mounts
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('patient-sync')
      bcRef.current.onmessage = handleSyncMessage
    } catch (e) {
      console.warn('BroadcastChannel not supported', e)
    }

    // Poll every 3 seconds in case BroadcastChannel is unavailable
    pollIntervalRef.current = setInterval(checkForUpdates, 3000)

    return () => {
      bcRef.current?.close()           
      clearInterval(pollIntervalRef.current) 
    }
  }, [handleSyncMessage, checkForUpdates])

  // Add a new patient record, then sync across all tabs
  const addPatient = useCallback(
    async (data) => {
      const db = await getDb()
      const sql = `
        INSERT INTO patients
          (first_name, last_name, email, phone, date_of_birth, gender,
           address, emergency_contact_name, emergency_contact_phone,
           medical_history, allergies)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `
      const vals = [
        data.first_name,
        data.last_name,
        data.email,
        data.phone,
        data.date_of_birth,
        data.gender,
        data.address,
        data.emergency_contact_name,
        data.emergency_contact_phone,
        data.medical_history,
        data.allergies,
      ]

      const res = await db.query(sql, vals)

      // Inform other tabs about the new patient
      notifyTabs()
      // Refresh this tab’s patient list immediately
      await loadPatients()

      return res.rows[0] 
    },
    [loadPatients, notifyTabs]
  )

  // Perform initial load of patients on mount
  useEffect(() => {
    loadPatients().finally(() => setLoading(false)) // Clear loading once done
  }, [loadPatients])

  
  return (
    <DatabaseContext.Provider
      value={{
        patients,
        addPatient,
        loading,
        error,
        // Expose a generic executeQuery method for raw SQL use
        executeQuery: async (q) => {
          const db = await getDb()
          return db.query(q)
        },
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}


