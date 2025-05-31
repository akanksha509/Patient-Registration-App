import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Alert,
  useTheme
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Download, Refresh } from '@mui/icons-material'

export default function ResultsTable({ results, loading, error, onRefresh }) {
  const theme = useTheme()
  const [pageSize, setPageSize] = useState(10)
  const [expandedCell, setExpandedCell] = useState(null)

  // Show an error alert if the SQL query failed
  if (error) return <Alert severity="error">{error}</Alert>

  const rowsArr   = Array.isArray(results) ? results : results?.rows || []
  const fieldList =
    results?.fields || (rowsArr[0] ? Object.keys(rowsArr[0]).map(n => ({ name: n })) : [])

  
  // If no data and not loading, prompt user to run a query
  if (!rowsArr.length && !loading) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">Run a query to see results…</Typography>
        </CardContent>
      </Card>
    )
  }

  
  // CSV export helper – allows analyst to download the current results
  const exportCsv = () => {
    if (!rowsArr.length) return
    const keys   = fieldList.map(f => f.name)
    const header = keys.join(',')
    const body   = rowsArr
      .map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `results-${Date.now()}.csv`
    })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  
  // Add a serial number to each row for easier referencing
  const rows = rowsArr.map((r, idx) => ({ ...r, id: r.id ?? idx, serial: idx + 1 }))

  // Convert raw field names into human-friendly headers
  const formatHeaderName = f => {
    const special = {
      emergency_contact_name:  'Emergency Contact Name',
      emergency_contact_phone: 'Emergency Contact Phone',
      date_of_birth:           'Date of Birth',
      first_name:              'First Name',
      last_name:               'Last Name',
      medical_history:         'Medical History'
    }
    return special[f] ??
      f.replace(/_/g, ' ')
       .split(' ')
       .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
       .join(' ')
  }

  // Predefined widths ensure columns have consistent sizes
  const widthMap = {
    serial: 70,
    first_name: 130,
    last_name: 130,
    email: 220,
    phone: 160,
    date_of_birth: 120,
    gender: 90,
    address: 280,
    emergency_contact_name: 200,
    emergency_contact_phone: 190,
    medical_history: 300,
    allergies: 200
  }
  const getColumnWidth = f => widthMap[f] || 150

  const allKeys     = fieldList.map(f => f.name)
  const dynamicKeys = allKeys.filter(k => !['id', 'created_at', 'updated_at'].includes(k))

  const columns = [
    {
      field: 'serial',
      headerName: 'S.No.',
      width: 70,
      headerClassName: 'bold-header',
      sortable: false,
      headerAlign: 'center',
      align: 'center',
      disableReorder: true,
      renderCell: p => (
        <Box sx={{ width: '100%', textAlign: 'center', fontWeight: 600 }}>{p.value}</Box>
      )
    },
    ...dynamicKeys.map(field => ({
      field,
      headerName: formatHeaderName(field),
      width: getColumnWidth(field),
      minWidth: 100,
      headerClassName: 'bold-header',
      headerAlign: 'center',
      align: 'center',
      renderCell: p => {
        
        let txt = field === 'date_of_birth' && p.value
          ? new Date(p.value).toLocaleDateString('en-IN')
          : (p.value ?? '').toString()

        const key   = `${p.id}:${field}`
        const open  = expandedCell === key
        const long  = txt.length > 20
        const view  = long && !open ? txt.slice(0, 20) + '…' : txt

        return (
          <Tooltip title={long ? txt : ''} arrow enterDelay={700}>
            <Box
              onClick={() => long && setExpandedCell(open ? null : key)}
              sx={{
                cursor: long ? 'pointer' : 'default',
                px: 1,
                whiteSpace: open ? 'normal' : 'nowrap',
                wordBreak: open ? 'break-word' : 'normal',
                textAlign: 'center'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: open ? 600 : 400 }}>
                {view}
              </Typography>
            </Box>
          </Tooltip>
        )
      }
    }))
  ]

  // styling section
  const gridSX = {
    border: `2px solid ${theme.palette.divider}`,
    borderRadius: 2,
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: theme.palette.mode === 'light'
        ? theme.palette.grey[200]
        : theme.palette.grey[800],
      borderBottom: `2px solid ${theme.palette.divider}`,
      minHeight: '60px !important'
    },
    '& .MuiDataGrid-columnHeader': {
      padding: '12px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 700,
      fontSize: '0.95rem',
      textAlign: 'center',
      lineHeight: 1.2,
      whiteSpace: 'normal',
      wordBreak: 'break-word'
    },
    '& .bold-header': {
      fontWeight: '800 !important',
      fontSize: '0.9rem !important',
      color: theme.palette.text.primary
    },
    '& .MuiDataGrid-cell': {
      padding: '0px',
      borderRight: `1px solid ${theme.palette.divider}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '52px'
    },
    '& .MuiDataGrid-row': {
      minHeight: '52px',
      '&:hover': { backgroundColor: theme.palette.action.hover },
      '&:nth-of-type(even)': {
        backgroundColor: theme.palette.mode === 'light'
          ? theme.palette.grey[50]
          : theme.palette.grey[900]
      }
    },
    '& .MuiDataGrid-cell:focus': { outline: 'none' },
    '& .MuiDataGrid-virtualScroller': {
      '&::-webkit-scrollbar': { width: 8, height: 8 },
      '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.grey[100] },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.grey[400],
        borderRadius: 4
      }
    }
  }

  return (
    <Card sx={{ boxShadow: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Database Results ({rows.length} records)
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={onRefresh} color="primary" size="large">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export to CSV">
            <IconButton onClick={exportCsv} disabled={!rows.length} color="primary" size="large">
              <Download />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ height: 650, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            pagination
            disableRowSelectionOnClick
            showCellVerticalBorder
            showColumnVerticalBorder
            autoHeight={false}
            getRowHeight={p =>
              dynamicKeys.some(k => expandedCell === `${p.id}:${k}`) ? 'auto' : 52
            }
            sx={gridSX}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } }
            }}
          />
        </Box>

        {expandedCell && (
          <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.info.light, borderRadius: 1 }}>
            <Typography variant="body2" color="info.dark">
              💡 Click on any expanded cell again to collapse it
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
