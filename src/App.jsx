import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  Menu as MenuIcon,
  PersonAdd,
  Search,
  Brightness7,
  Brightness4,
  Close as CloseIcon
} from '@mui/icons-material'

import Logo from '/logo.png'                  
import SyncManager from './components/SyncManager'
import { ColorModeProvider, useColorMode } from './contexts/ColorModeContext'
import { DatabaseProvider, useDatabaseContext } from './contexts/DatabaseContext'
import RegisterPage from './pages/RegisterPage'
import QueryPage    from './pages/QueryPage'
import ErrorBoundary from './components/ErrorBoundary'

// AppHeader renders the top navigation bar with logo, sync status, and theme toggle
function AppHeader({ page, setPage, mode, toggleColorMode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Define navigation items for desktop and mobile
  const nav = [
    { id: 'register', label: 'Register', icon: <PersonAdd /> },
    { id: 'query',    label: 'Query',    icon: <Search    /> },
  ]

  return (
    <>
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(135deg, #1e88e5 0%, #26c6da 100%)',
          boxShadow: 3
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo and title on the left side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Box component="img" src={Logo} alt="logo" sx={{ height: 32 }} />
            <Typography variant="h6" fontWeight={700} color="common.white">
              Patient Registration
            </Typography>
          </Box>

          {/* Show sync status indicator */}
          <SyncManager />

          {/* Toggle between light and dark themes */}
          <Button
            onClick={toggleColorMode}
            sx={{
              borderRadius: 99,
              px: 1.5,
              py: 0.5,
              color: 'inherit',
              minWidth: 40,
              backgroundColor: 'rgba(255,255,255,0.20)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.30)' }
            }}
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </Button>

          {/* Render desktop navigation buttons if not on mobile */}
          {!isMobile && nav.map(n => (
            <Button
              key={n.id}
              color="inherit"
              variant={page === n.id ? 'outlined' : 'text'}
              onClick={() => setPage(n.id)}
              sx={{ ml: 1, borderColor: 'rgba(255,255,255,0.7)' }}
            >
              {n.label}
            </Button>
          ))}
        </Toolbar>
      </AppBar>

      {/* Drawer for mobile navigation */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Menu</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon/></IconButton>
          </Box>
          <List>
            {nav.map(n => (
              <ListItem
                button
                key={n.id}
                selected={page === n.id}
                onClick={() => {
                  setPage(n.id)
                  setDrawerOpen(false)
                }}
              >
                <ListItemIcon>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  )
}

// Shell wraps the main app content, handling DB initialization and error states
function Shell() {
  const [page, setPage] = useState('register')
  const { mode, toggleColorMode } = useColorMode()
  const { loading, error } = useDatabaseContext()

  // Show loading spinner while PGlite initializes
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Initializing DB…</Typography>
      </Box>
    )
  }
  // If database fails to load, show an error
  if (error) {
    return (
      <Container sx={{ pt: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: mode === 'light'
          ? 'radial-gradient(circle at top left, rgba(38,198,218,0.20), transparent 70%)'
          : 'radial-gradient(circle at bottom right, rgba(0,51,68,0.50), transparent 80%)'
      }}
    >
      {/* Render navigation header */}
      <AppHeader
        page={page}
        setPage={setPage}
        mode={mode}
        toggleColorMode={toggleColorMode}
      />

      {/* Show either RegisterPage or QueryPage inside an error boundary */}
      {page === 'register' ? (
        <ErrorBoundary>
          <RegisterPage />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <QueryPage />
        </ErrorBoundary>
      )}

      {/* Simple footer at the bottom */}
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 3,
          mt: 4,
          color: 'text.secondary',
          position: 'relative',
          zIndex: 1
        }}
      >
        © {new Date().getFullYear()}, Made with ❤️ Love and Care
      </Box>

      {/* Inverts datepicker icon colors in dark mode */}
      <style>
        {`
          body[data-theme="dark"] input[type=date]::-webkit-calendar-picker-indicator {
            filter: invert(1) hue-rotate(180deg) brightness(1.5);
          }
        `}
      </style>
    </Box>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <DatabaseProvider>
          <Shell />
        </DatabaseProvider>
      </ColorModeProvider>
    </ErrorBoundary>
  )
}


