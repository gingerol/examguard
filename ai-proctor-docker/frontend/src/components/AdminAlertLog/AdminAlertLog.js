import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Modal from '@mui/material/Modal';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import IconButton from '@mui/material/IconButton';
import TableSortLabel from '@mui/material/TableSortLabel';
import CloseIcon from '@mui/icons-material/Close';
import { visuallyHidden } from '@mui/utils';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import formatISO from 'date-fns/formatISO';
import parseISO from 'date-fns/parseISO';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://examguard-production-90e5.up.railway.app';

const AdminAlertLog = ({ currentUser }) => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(0); // API is 1-indexed, MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalAlerts, setTotalAlerts] = useState(0);

  // Filter state
  const [filters, setFilters] = useState({
    session_id: '',
    student_username: '',
    alert_type: '',
    severity: '',
    date_from: null, // Initialize as null for DatePicker
    date_to: null,   // Initialize as null for DatePicker
  });
  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  // State for modal
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState(''); // For blob URL
  const [snapshotError, setSnapshotError] = useState('');

  const fetchAlerts = useCallback(async () => {
    if (!currentUser || !currentUser.token) {
      setError("User not authenticated.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const params = {
      page: page + 1,
      per_page: rowsPerPage,
      sort_by: sortConfig.key,
      order: sortConfig.direction,
    };

    // Add active filters to params
    for (const [key, value] of Object.entries(filters)) {
      if (value) { // Only add if filter has a value
        if (key === 'date_from' || key === 'date_to') {
          // Ensure Date objects are formatted to ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
          // The backend expects ISO format; formatISO will give YYYY-MM-DD'T'HH:mm:ssXXX
          // If only date part is needed, adjust formatting. For now, full ISO.
          try {
            params[key] = formatISO(value); 
          } catch (dateError) {
            console.warn(`Invalid date for ${key}:`, value, dateError);
            // Potentially set an error state for the specific date field or skip this filter
          }
        } else {
          params[key] = value;
        }
      }
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/alerts`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
        params: params,
      });
      setAlerts(response.data.alerts || []);
      setTotalAlerts(response.data.total_alerts || 0);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setError(err.response?.data?.msg || "Failed to fetch alerts. Please try again.");
      setAlerts([]);
      setTotalAlerts(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, page, rowsPerPage, filters, sortConfig /* TODO: Add more filter states if they are not in 'filters' object */]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  const handleDateChange = (name, date) => {
    setFilters(prevFilters => ({
        ...prevFilters,
        [name]: date, // date will be a Date object from DatePicker
    }));
    setPage(0);
  };
  
  const clearFilters = () => {
    setFilters({
        session_id: '',
        student_username: '',
        alert_type: '',
        severity: '',
        date_from: null,
        date_to: null,
    });
    setPage(0);
    // fetchAlerts will be called due to useEffect dependency on filters changing
  };

  const handleSortRequest = (property) => {
    const isAsc = sortConfig.key === property && sortConfig.direction === 'asc';
    setSortConfig({ key: property, direction: isAsc ? 'desc' : 'asc' });
    setPage(0); // Reset to first page when sorting changes
  };

  // Define table headers with their IDs and labels for sorting
  const headCells = [
    { id: 'timestamp', numeric: false, disablePadding: false, label: 'Timestamp' },
    { id: 'alert_id', numeric: false, disablePadding: false, label: 'Alert ID', sortable: false },
    { id: 'session_id', numeric: false, disablePadding: false, label: 'Session ID' },
    { id: 'student_username', numeric: false, disablePadding: false, label: 'Student' },
    { id: 'alert_type', numeric: false, disablePadding: false, label: 'Type' },
    { id: 'severity', numeric: false, disablePadding: false, label: 'Severity' },
    { id: 'details', numeric: false, disablePadding: false, label: 'Details', sortable: false },
    { id: 'snapshot_filename', numeric: false, disablePadding: false, label: 'Snapshot', sortable: false },
  ];

  const handleOpenModal = async (alert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
    setSnapshotUrl(''); // Reset previous snapshot
    setSnapshotError('');

    if (alert.snapshot_filename && currentUser && currentUser.token) {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/admin/snapshots/${alert.snapshot_filename}`,
          {
            headers: { Authorization: `Bearer ${currentUser.token}` },
            responseType: 'blob',
          }
        );
        const objectURL = URL.createObjectURL(response.data);
        setSnapshotUrl(objectURL);
      } catch (err) {
        console.error("Error fetching snapshot:", err);
        setSnapshotError(err.response?.data?.msg || 'Failed to load snapshot.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
    if (snapshotUrl) {
      URL.revokeObjectURL(snapshotUrl); // Clean up blob URL
    }
    setSnapshotUrl('');
    setSnapshotError('');
  };

  // Style for the modal
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 700,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 0, // Padding will be handled by Card
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography component="h1" variant="h4" color="primary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          Admin - Detailed Alert Log
        </Typography>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
            <Typography variant="h6" gutterBottom>Filters</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3} lg={2}>
                <TextField fullWidth label="Session ID" name="session_id" value={filters.session_id} onChange={handleFilterChange} variant="outlined" size="small"/>
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={2}>
                <TextField fullWidth label="Student Username" name="student_username" value={filters.student_username} onChange={handleFilterChange} variant="outlined" size="small"/>
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Alert Type</InputLabel>
                  <Select name="alert_type" value={filters.alert_type} label="Alert Type" onChange={handleFilterChange}>
                    <MenuItem value=""><em>All</em></MenuItem>
                    <MenuItem value="no_face_detected">No Face Detected</MenuItem>
                    <MenuItem value="multiple_faces_detected">Multiple Faces</MenuItem>
                    <MenuItem value="looking_away">Looking Away</MenuItem>
                    <MenuItem value="loud_noise_detected">Loud Noise</MenuItem>
                    {/* Add other alert types as they are defined */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3} lg={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Severity</InputLabel>
                  <Select name="severity" value={filters.severity} label="Severity" onChange={handleFilterChange}>
                    <MenuItem value=""><em>All</em></MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}> 
                <DatePicker
                  label="Date From"
                  value={filters.date_from ? parseISO(filters.date_from) : null} // Ensure value is Date or null
                  onChange={(newValue) => handleDateChange('date_from', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid> 
              <Grid item xs={12} sm={6} md={4} lg={2}> 
                <DatePicker
                  label="Date To"
                  value={filters.date_to ? parseISO(filters.date_to) : null}
                  onChange={(newValue) => handleDateChange('date_to', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={2} sx={{display: 'flex', alignItems: 'center'}}>
                  <Button variant="outlined" onClick={clearFilters} size="small">Clear Filters</Button>
              </Grid>
            </Grid>
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          {!isLoading && !error && (
            <TableContainer component={Paper} sx={{mt: 2}}>
              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={sortConfig.key === headCell.id ? sortConfig.direction : false}
                      >
                        {headCell.sortable !== false ? (
                          <TableSortLabel
                            active={sortConfig.key === headCell.id}
                            direction={sortConfig.key === headCell.id ? sortConfig.direction : 'asc'}
                            onClick={() => handleSortRequest(headCell.id)}
                          >
                            {headCell.label}
                            {sortConfig.key === headCell.id ? (
                              <Box component="span" sx={visuallyHidden}>
                                {sortConfig.direction === 'desc' ? 'sorted descending' : 'sorted ascending'}
                              </Box>
                            ) : null}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No alerts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow 
                        hover 
                        role="button"
                        tabIndex={-1} 
                        key={alert.alert_id}
                        onClick={() => handleOpenModal(alert)}
                        sx={{ cursor: 'pointer'}}
                      >
                        <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                        <TableCell sx={{fontSize: '0.75rem', wordBreak: 'break-all'}}>{alert.alert_id}</TableCell>
                        <TableCell sx={{fontSize: '0.75rem', wordBreak: 'break-all'}}>{alert.session_id}</TableCell>
                        <TableCell>{alert.student_username || alert.student_id || 'N/A'}</TableCell>
                        <TableCell>{alert.alert_type}</TableCell>
                        <TableCell>{alert.severity}</TableCell>
                        <TableCell sx={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={typeof alert.details === 'object' && alert.details !== null ? (alert.details.message || JSON.stringify(alert.details)) : alert.details}>
                          {typeof alert.details === 'object' && alert.details !== null ? (alert.details.message || JSON.stringify(alert.details)) : alert.details}
                        </TableCell>
                        <TableCell>
                          {alert.snapshot_filename ? (
                            'Yes' 
                          ) : (
                            'No'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!isLoading && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                component="div"
                count={totalAlerts}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{mt: 2}}
              />
          )}
        </Paper>

        {selectedAlert && (
          <Modal
            open={isModalOpen}
            onClose={handleCloseModal}
            aria-labelledby="alert-details-modal-title"
            aria-describedby="alert-details-modal-description"
          >
            <Card sx={modalStyle}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #ddd' }}>
                <Typography id="alert-details-modal-title" variant="h6" component="h2">
                  Alert Details
                </Typography>
                <IconButton onClick={handleCloseModal} aria-label="close">
                  <CloseIcon />
                </IconButton>
              </Box>
              <CardContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}> {/* Added scroll for long content */}
                <Typography gutterBottom><strong>Alert ID:</strong> {selectedAlert.alert_id}</Typography>
                <Typography gutterBottom><strong>Timestamp:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</Typography>
                <Typography gutterBottom><strong>Session ID:</strong> {selectedAlert.session_id}</Typography>
                <Typography gutterBottom><strong>Student:</strong> {selectedAlert.student_username || selectedAlert.student_id || 'N/A'}</Typography>
                <Typography gutterBottom><strong>Type:</strong> {selectedAlert.alert_type}</Typography>
                <Typography gutterBottom><strong>Severity:</strong> {selectedAlert.severity}</Typography>
                <Typography gutterBottom component="div"><strong>Details:</strong> <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin:0}}>{typeof selectedAlert.details === 'object' && selectedAlert.details !== null ? (selectedAlert.details.message || JSON.stringify(selectedAlert.details)) : selectedAlert.details}</pre></Typography>
                
                {selectedAlert.snapshot_filename && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom><strong>Snapshot:</strong></Typography>
                    {snapshotError && <Alert severity="error">{snapshotError}</Alert>}
                    {snapshotUrl ? (
                      <CardMedia
                        component="img"
                        src={snapshotUrl}
                        alt={`Snapshot for alert ${selectedAlert.alert_id}`}
                        sx={{ maxHeight: 400, objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    ) : (
                      !snapshotError && <CircularProgress size={24} /> // Show loader while fetching if no error
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Modal>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default AdminAlertLog; 