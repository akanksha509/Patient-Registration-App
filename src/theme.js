import { createTheme } from '@mui/material'

export const getTheme = mode =>
  createTheme({
    palette: { mode },
    components: {
      MuiDataGrid: { styleOverrides: { root: { border: 0 } } },
    },
  })
