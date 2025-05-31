import React, { createContext, useContext, useState, useMemo } from 'react'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'

// Context to share current color mode (light/dark) throughout the app
const ColorCtx = createContext(null)
export const useColorMode = () => useContext(ColorCtx)

export function ColorModeProvider({ children }) {
  // Initialize mode from localStorage so user preference persists across reloads
  const [mode, setMode] = useState(
    () => localStorage.getItem('colorMode') || 'light'
  )

  // Toggle between light and dark; also save choice to localStorage
  const toggle = () => {
    const m = mode === 'light' ? 'dark' : 'light'
    setMode(m)
    localStorage.setItem('colorMode', m)
  }

  // Memoize MUI theme object so it rebuilds only when `mode` changes
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        components: {
         
          MuiDataGrid: { styleOverrides: { root: { border: 0 } } }
        }
      }),
    [mode]
  )

  return (
    <ColorCtx.Provider value={{ mode, toggleColorMode: toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorCtx.Provider>
  )
}
