import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Divider,
  Paper
} from '@mui/material'
import {
  Person,
  Email,
  Phone,
  CalendarToday,
  LocationOn,
  LocalHospital,
  Security
} from '@mui/icons-material'
import { useDatabaseContext } from '../contexts/DatabaseContext'
import { getDb } from '../db'  // used for uniqueness checks to prevent duplicates

// Fetch country codes hook
const useCountryCodes = () => {
  const [countryCodes, setCountryCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetching external country data improves phone validation UX
    const fetchCountryCodes = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,flag,cca2')
        if (!res.ok) throw new Error('Fetch failed')
        const list = await res.json()
        const formatted = list
          .filter(c => c.idd?.root && c.idd?.suffixes?.length)
          .map(c => ({
            code: c.idd.root + (c.idd.suffixes[0] || ''),
            flag: c.flag || '🌍',
            country: c.name.common,
            cca2: c.cca2
          }))
          .sort((a, b) => a.country.localeCompare(b.country))
        setCountryCodes(formatted)
      } catch (err) {
        // Fallback ensures app still works offline or on API failure
        console.warn(err)
        setError(err.message)
        setCountryCodes([
          { code: '+1', flag: '🇺🇸', country: 'United States', cca2: 'US' },
          { code: '+91', flag: '🇮🇳', country: 'India', cca2: 'IN' },
          { code: '+44', flag: '🇬🇧', country: 'United Kingdom', cca2: 'GB' },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchCountryCodes()
  }, [])

  return { countryCodes, loading, error }
}

// Phone validation + formatting utilities
const validatePhone = (countryCode, phone) => {
  if (!countryCode || !phone) return false
  const digits = phone.replace(/\D/g, '')
  // Country-specific length rules to reduce invalid entries
  const rules = {
    '+91': { min: 10, max: 10 },
    '+1': { min: 10, max: 10 },
    '+44': { min: 10, max: 11 },
  }
  const { min, max } = rules[countryCode] || { min: 7, max: 15 }
  return digits.length >= min && digits.length <= max
}

const formatPhone = (val, countryCode) => {
  const d = val.replace(/\D/g, '')
  // Format phone as user types to improve readability
  if (countryCode === '+91') {
    if (d.length <= 5) return d
    return `${d.slice(0, 5)} ${d.slice(5, 10)}`
  }
  if (countryCode === '+1') {
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
  }
  return d.replace(/(\d{3,4})(?=\d)/g, '$1 ')
}

// Section header component to visually separate sections
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <Box sx={{ mb: 3 }}>
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        p: 2,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        borderRadius: 2,
        color: 'white',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
      }}
    >
      <Icon sx={{ fontSize: 28 }} />
      <Box>
        <Typography variant="h5" fontWeight="bold">{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  </Box>
)

export default function PatientRegistrationForm() {
  // Grab the addPatient function to insert data into PGlite
  const { addPatient } = useDatabaseContext()
  // Load country codes for phone inputs
  const { countryCodes, loading: ccLoading, error: ccError } = useCountryCodes()

  // Form state holds all input values
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    emCountryCode: '+91',
    emPhone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    emergencyContactName: '',
    medicalHistory: '',
    allergies: ''
  })
  const [errors, setErrors] = useState({})      // Track validation errors
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)    // Show success / error messages

  // Update formData and clear related error if present
  const handleInput = (key, val) => {
    setFormData(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }
  // Format phone in real-time for primary and emergency numbers
  const handlePhone = val => handleInput('phone', formatPhone(val, formData.countryCode))
  const handleEmPhone = val => handleInput('emPhone', formatPhone(val, formData.emCountryCode))

  // Basic field-level validation before uniqueness checks
  const validateForm = () => {
    const e = {}
    if (!formData.firstName.trim() || formData.firstName.length < 2)
      e.firstName = 'First name must be at least 2 characters'
    if (!formData.lastName.trim() || formData.lastName.length < 2)
      e.lastName = 'Last name must be at least 2 characters'
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'A valid email is required'
    if (!validatePhone(formData.countryCode, formData.phone))
      e.phone = 'A valid phone number is required'
    if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required'
    if (!formData.gender) e.gender = 'Please select a gender'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Check that email is not already in the database
  const validateEmailUnique = async email => {
    try {
      const db = await getDb()
      const res = await db.query(
        'SELECT COUNT(*) AS count FROM patients WHERE email = $1',
        [email.trim()]
      )
      return parseInt(res.rows[0].count, 10) === 0
    } catch {
      return true // If DB fails, assume unique to avoid blocking
    }
  }
  // Check that phone is not already in the database
  const validatePhoneUnique = async fullPhone => {
    try {
      const db = await getDb()
      const res = await db.query(
        'SELECT COUNT(*) AS count FROM patients WHERE phone = $1',
        [fullPhone]
      )
      return parseInt(res.rows[0].count, 10) === 0
    } catch {
      return true
    }
  }

  // Runs when the user clicks “Register Patient”
  const handleSubmit = async () => {
    if (!validateForm()) {
      setStatus({ type: 'error', message: 'Please fix the errors above.' })
      return
    }

    // Prevent duplicate submissions while async checks are in progress
    setSubmitting(true)
    setStatus(null)

    // Normalize email and phone for uniqueness queries
    const rawEmail = formData.email.trim().toLowerCase()
    const rawPhone = formData.countryCode + formData.phone.replace(/\D/g, '')

    // Ensure email is not already registered
    if (!(await validateEmailUnique(rawEmail))) {
      setErrors(e => ({ ...e, email: 'This email is already registered' }))
      setStatus({ type: 'error', message: 'This email is already registered.' })
      setSubmitting(false)
      return
    }

    // Ensure phone is not already registered
    if (!(await validatePhoneUnique(rawPhone))) {
      setErrors(e => ({ ...e, phone: 'This phone is already registered' }))
      setStatus({ type: 'error', message: 'This phone number is already registered.' })
      setSubmitting(false)
      return
    }

    try {
      // Convert date to ISO format for DB storage
      const formattedDate = formData.dateOfBirth
        ? new Date(formData.dateOfBirth).toISOString().split('T')[0]
        : ''
      const cleanPhone = formData.phone.replace(/\D/g, '')
      const cleanEmPhone = formData.emPhone.replace(/\D/g, '')

      // Prepare payload with both CamelCase (for UI) and snake_case (for DB)
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: rawEmail,
        phone: rawPhone,
        dateOfBirth: formattedDate,
        gender: formData.gender,
        address: formData.address.trim(),
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: cleanEmPhone
          ? formData.emCountryCode + cleanEmPhone
          : '',
        medicalHistory: formData.medicalHistory.trim(),
        allergies: formData.allergies.trim(),

        // snake_case for DB insertion
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        date_of_birth: formattedDate,
        emergency_contact_name: formData.emergencyContactName.trim(),
        emergency_contact_phone: cleanEmPhone
          ? formData.emCountryCode + cleanEmPhone
          : '',
        medical_history: formData.medicalHistory.trim(),

        // Extras for display or future use
        full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        patient_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`
      }

      await addPatient(payload) // Insert into PGlite, triggers multi-tab sync
      setStatus({ type: 'success', message: 'Patient registered successfully!' })
      // Reset form for next entry
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: '+91',
        phone: '',
        emCountryCode: '+91',
        emPhone: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContactName: '',
        medicalHistory: '',
        allergies: ''
      })
      setErrors({})
    } catch (err) {
      console.error(err)
      // Handle DB-level uniqueness errors as fallback
      if (err.message.toLowerCase().includes('unique constraint')) {
        setStatus({ type: 'error', message: 'Email or phone already exists.' })
      } else {
        setStatus({ type: 'error', message: err.message || 'Registration failed.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Page header styling */}
      <Paper
        elevation={3}
        sx={{
          mb: 4,
          p: 4,
          background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
          color: 'white',
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Person sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h3" fontWeight="bold">
              Patient Registration
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8, mt: 1 }}>
              Register a new patient in the healthcare system
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Show warning if country-code fetch failed */}
      {ccError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Failed to load country codes, using fallback list.
        </Alert>
      )}
      {/* Show form-wide success or error messages */}
      {status && (
        <Alert severity={status.type} sx={{ mb: 3 }}>
          {status.message}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Personal Information section */}
          <SectionHeader
            icon={Person}
            title="Personal Information"
            subtitle="Basic patient details and identification"
          />
          <Grid container spacing={3}>
            {/* First Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                required
                fullWidth
                value={formData.firstName}
                onChange={e => handleInput('firstName', e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            {/* Last Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                required
                fullWidth
                value={formData.lastName}
                onChange={e => handleInput('lastName', e.target.value)}
                error={!!errors.lastName}
                helperText={errors.lastName}
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={formData.email}
                onChange={e => handleInput('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            {/* Phone with country code selector */}
            <Grid item xs={12} sm={6}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <FormControl fullWidth disabled={submitting || ccLoading}>
                    <InputLabel>Country</InputLabel>
                    <Select
                      value={formData.countryCode}
                      onChange={e => {
                        handleInput('countryCode', e.target.value)
                        handleInput('phone', '') // reset phone when code changes
                      }}
                      label="Country"
                      MenuProps={{
                        PaperProps: { style: { maxHeight: 300 } }
                      }}
                    >
                      {ccLoading ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          Loading…
                        </MenuItem>
                      ) : (
                        countryCodes.map(c => (
                          <MenuItem key={c.cca2} value={c.code}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 0,
                                width: '100%'
                              }}
                            >
                              <span>{c.flag}</span>
                              <span style={{ fontWeight: 'bold' }}>{c.code}</span>
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.85em',
                                  opacity: 0.7
                                }}
                              >
                                {c.country}
                              </span>
                            </Box>
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    label="Phone"
                    required
                    fullWidth
                    value={formData.phone}
                    onChange={e => handlePhone(e.target.value)}
                    error={!!errors.phone}
                    helperText={errors.phone}
                    disabled={submitting}
                    placeholder="Enter phone number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            {/* Date of Birth */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date of Birth"
                type="date"
                required
                fullWidth
                value={formData.dateOfBirth}
                onChange={e => handleInput('dateOfBirth', e.target.value)}
                error={!!errors.dateOfBirth}
                helperText={errors.dateOfBirth}
                disabled={submitting}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            {/* Gender */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.gender} disabled={submitting}>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={e => handleInput('gender', e.target.value)}
                  label="Gender"
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                </Select>
                {errors.gender && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.gender}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 5 }} />

          {/* Contact & Address section */}
          <SectionHeader
            icon={LocationOn}
            title="Contact & Address"
            subtitle="Location and emergency contact information"
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={3}
                value={formData.address}
                onChange={e => handleInput('address', e.target.value)}
                disabled={submitting}
                placeholder="Enter full address including street, city, state, and postal code"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <LocationOn />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Name"
                fullWidth
                value={formData.emergencyContactName}
                onChange={e => handleInput('emergencyContactName', e.target.value)}
                disabled={submitting}
                placeholder="Enter emergency contact's name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <FormControl fullWidth disabled={submitting || ccLoading}>
                    <InputLabel>Code</InputLabel>
                    <Select
                      value={formData.emCountryCode}
                      onChange={e => {
                        handleInput('emCountryCode', e.target.value)
                        handleInput('emPhone', '')
                      }}
                      label="Code"
                      MenuProps={{
                        PaperProps: { style: { maxHeight: 300 } }
                      }}
                    >
                      {countryCodes.map(c => (
                        <MenuItem key={c.cca2} value={c.code}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              minWidth: 0,
                              width: '100%'
                            }}
                          >
                            <span>{c.flag}</span>
                            <span style={{ fontWeight: 'bold' }}>{c.code}</span>
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.85em',
                                opacity: 0.7
                              }}
                            >
                              {c.country}
                            </span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    label="Emergency Phone"
                    fullWidth
                    value={formData.emPhone}
                    onChange={e => handleEmPhone(e.target.value)}
                    disabled={submitting}
                    placeholder="Emergency Phone"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ my: 5 }} />

          {/* Medical Information section */}
          <SectionHeader
            icon={LocalHospital}
            title="Medical Information"
            subtitle="Patient's medical history and health details"
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Medical History"
                fullWidth
                multiline
                rows={4}
                value={formData.medicalHistory}
                onChange={e => handleInput('medicalHistory', e.target.value)}
                disabled={submitting}
                placeholder="Include past surgeries, chronic conditions, medications, etc."
                helperText="Provide detailed medical history to help providers"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <LocalHospital />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Allergies"
                fullWidth
                multiline
                rows={3}
                value={formData.allergies}
                onChange={e => handleInput('allergies', e.target.value)}
                disabled={submitting}
                placeholder="Known allergies or write 'None known'"
                helperText="Important for safe treatment"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <Security />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>

          {/* Submit button */}
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Person />}
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #1976d2, #9c27b0)',
                borderRadius: 2,
                boxShadow: '0 4px 16px rgba(25,118,210,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #8e24aa)',
                  boxShadow: '0 6px 20px rgba(25,118,210,0.5)'
                },
                '&:disabled': {
                  background: 'rgba(0,0,0,0.12)',
                  color: 'rgba(0,0,0,0.26)'
                }
              }}
            >
              {submitting ? 'Registering Patient...' : 'Register Patient'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
