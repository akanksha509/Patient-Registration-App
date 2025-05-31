import React, { useState } from 'react'
import { Container, Grid, Box } from '@mui/material'
import SqlEditor      from '../components/SqlEditor'
import ResultsTable   from '../components/ResultsTable'

export default function QueryPage () {
  // Store the latest SQL query results so we can pass them to the table
  const [results,setResults] = useState(null)
  
  return (
    <Container maxWidth="xl" sx={{py:4}}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SqlEditor onResults={r=>setResults(r)}/>
        </Grid>
        <Grid item xs={12}>
          <ResultsTable results={results} onRefresh={()=>setResults(null)}/>
        </Grid>
      </Grid>
    </Container>
  )
}
