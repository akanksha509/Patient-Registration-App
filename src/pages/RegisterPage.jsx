import React, { useState } from 'react'
import { Container, Fade, Alert, Box } from '@mui/material'
import PatientForm from '../components/PatientForm'

export default function RegisterPage () {
  const [msg,setMsg] = useState('')
  return (
    <Container maxWidth="md" sx={{py:4}}>
      <Fade in={!!msg}><Alert severity="success" sx={{mb:3}}>{msg}</Alert></Fade>
      <PatientForm onSuccess={()=>{ setMsg('Patient registered!'); setTimeout(()=>setMsg(''),4000) }}/>
    </Container>
  )
}
