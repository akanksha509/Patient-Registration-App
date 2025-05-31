import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Card, CardContent, Typography, Button, Alert,
  Box, IconButton, Tooltip,
} from '@mui/material'
import { PlayArrow, ContentCopy, Clear } from '@mui/icons-material'
import { useDatabaseContext } from '../contexts/DatabaseContext'
import { useColorMode } from '../contexts/ColorModeContext'

const SAMPLE = `-- Example queries
SELECT * FROM patients ORDER BY created_at DESC LIMIT 10;

SELECT gender, COUNT(*) FROM patients GROUP BY gender;`

export default function SqlEditor ({ onResults }) {
  const { executeQuery } = useDatabaseContext()
  const { mode } = useColorMode()
  const [sql, setSql] = useState(SAMPLE)
  const [busy, setBusy] = useState(false)
  const [err , setErr ] = useState(null)

  const run = async () => {
    if (!sql.trim()) return
    setBusy(true); setErr(null)
    try {
      const res = await executeQuery(sql)
      onResults(res)
    } catch (e) { setErr(e.message) }
    finally   { setBusy(false) }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{display:'flex',alignItems:'center',mb:1}}>
          <Typography variant="h6" sx={{flexGrow:1}}>SQL Console</Typography>
          <Tooltip title="Copy"><IconButton onClick={()=>navigator.clipboard.writeText(sql)}><ContentCopy/></IconButton></Tooltip>
          <Tooltip title="Clear"><IconButton onClick={()=>setSql('')}><Clear/></IconButton></Tooltip>
        </Box>

        {err && <Alert severity="error" sx={{mb:2}}>{err}</Alert>}

        <Box sx={{border:1,borderColor:'divider',borderRadius:1}}>
          <Editor value={sql} onChange={setSql}
            height="200px" language="sql" theme={mode==='dark'?'vs-dark':'vs'}
            options={{ minimap:{enabled:false}, fontSize:14 }}
          />
        </Box>

        <Button variant="contained" startIcon={<PlayArrow/>}
          sx={{mt:2}} disabled={busy} onClick={run}>
          {busy?'Executing…':'Execute'}
        </Button>
      </CardContent>
    </Card>
  )
}
