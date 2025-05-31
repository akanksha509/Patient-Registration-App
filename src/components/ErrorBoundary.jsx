import React from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'

export default class ErrorBoundary extends React.Component {
  // Initialize state to track whether an error has occurred
  constructor(props) {
    super(props)
    this.state = { hasError: false, err: null }
  }

  // Update state when an error is thrown, so we can display fallback UI
  static getDerivedStateFromError(err) {
    return { hasError: true, err }
  }

  // Log error details for debugging, without exposing sensitive info to users
  componentDidCatch(err, info) {
    console.error(err, info)
  }

  render() {
    // If no error, render child components normally
    if (!this.state.hasError) {
      return this.props.children
    }

    // Fallback UI: show an alert with error message and a retry button
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">
            Something went wrong
          </Typography>
          <Typography>{this.state.err?.message}</Typography>
          <Button
            sx={{ mt: 2 }}
            onClick={() => this.setState({ hasError: false, err: null })}
          >
            Retry
          </Button>
        </Alert>
      </Box>
    )
  }
}

