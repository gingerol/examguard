import React, { useState, useEffect, useRef, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import StudentCard from './StudentCard';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import io from 'socket.io-client';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Alert component for Snackbar
const SnackAlert = React.forwardRef(function SnackAlert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // State for Snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // 'success', 'error', 'warning', 'info'

  const handleShowSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleNewSession = useCallback((newSessionData) => {
    console.log("[SocketIO] Received new_student_session_started:", newSessionData);
    setSessions(prevSessions => {
      if (prevSessions.find(s => s.session_id === newSessionData.session_id)) {
        return prevSessions.map(s => s.session_id === newSessionData.session_id ? newSessionData : s);
      }
      return [newSessionData, ...prevSessions];
    });
    handleShowSnackbar(`New session started: ${newSessionData.student_name || 'Unknown Student'}`, 'info');
  }, []);

  const handleSessionEnded = useCallback((data) => {
    console.log("[SocketIO] Received student_session_ended:", data);
    const endedSession = sessions.find(s => s.session_id === data.session_id);
    setSessions(prevSessions => prevSessions.filter(s => s.session_id !== data.session_id));
    if (endedSession) {
        handleShowSnackbar(`Session ended for: ${endedSession.student_name || 'Unknown Student'}`, 'warning');
    }
  }, [sessions]);

  const handleSessionUpdate = useCallback((updatedSessionData) => {
    console.log("[SocketIO] Received student_session_update:", updatedSessionData);
    setSessions(prevSessions => 
      prevSessions.map(s => 
        s.session_id === updatedSessionData.session_id ? { ...s, ...updatedSessionData } : s
      )
    );
    if (updatedSessionData.new_alert_details) {
      console.log("New alert received for session:", updatedSessionData.session_id, "Details:", updatedSessionData.new_alert_details);
    }
  }, []);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // The JWT token is automatically added by the Axios interceptor configured in App.js
        const response = await axios.get('http://localhost:5000/api/admin/dashboard/active_sessions');
        setSessions(response.data || []);
      } catch (err) {
        console.error("Error fetching active sessions:", err);
        let errorMessage = "Could not fetch active sessions.";
        if (err.response) {
          // Backend error with a message
          errorMessage = err.response.data?.msg || err.response.data?.error || errorMessage;
          if (err.response.status === 403) {
            errorMessage = "Access denied. You may not have admin privileges.";
          }
        }
        setError(errorMessage);
        setSessions([]); // Clear any previous sessions on error
      }
      setIsLoading(false);
    };

    fetchActiveSessions();

    // --- WebSocket Connection Setup (Sub-Task 4.4.2) ---
    const token = localStorage.getItem('proctoring_token');
    if (token) {
      // Ensure we don't create multiple socket connections if useEffect re-runs unexpectedly
      if (!socketRef.current) {
        console.log("[SocketIO] Attempting to connect to WebSocket with token...");
        const newSocket = io('http://localhost:5000/ws/admin_dashboard', {
          query: { token: `Bearer ${token}` },
          transports: ['websocket'] // Prefer WebSocket to avoid potential CORS issues with polling
        });

        newSocket.on('connect', () => {
          console.log(`[SocketIO] Connected to admin dashboard namespace with SID: ${newSocket.id}`);
        });

        newSocket.on('connection_ack', (data) => {
          console.log('[SocketIO] Connection Acknowledged:', data.message);
        });

        newSocket.on('disconnect', (reason) => {
          console.log(`[SocketIO] Disconnected from admin dashboard: ${reason}`);
        });

        newSocket.on('connect_error', (err) => {
          console.error(`[SocketIO] Connection Error: ${err.message}`, err);
          setError(prevError => prevError ? `${prevError} WebSocket connection failed.` : "WebSocket connection failed.");
        });

        // Register event listeners for session updates (Sub-Task 4.4.3)
        newSocket.on('new_student_session_started', handleNewSession);
        newSocket.on('student_session_ended', handleSessionEnded);
        newSocket.on('student_session_update', handleSessionUpdate);

        socketRef.current = newSocket;
      }
    } else {
      console.warn("[SocketIO] No token found, WebSocket connection not attempted.");
      setError(prevError => prevError ? `${prevError} WebSocket connection requires authentication.` : "WebSocket connection requires authentication.");
    }

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log("[SocketIO] Disconnecting WebSocket on component unmount.");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLoading, handleNewSession, handleSessionEnded, handleSessionUpdate]);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading active sessions...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ '& .MuiAlert-message': { flexGrow: 1, textAlign: 'center'} }}> 
          <Typography variant="h6">Failed to Load Dashboard</Typography>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" color="primary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Admin Dashboard - Active Student Sessions
      </Typography>
      {!isLoading && error && sessions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
      )}
      {sessions.length === 0 && !isLoading && !error && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">
            No active student sessions at the moment.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            As students start monitoring, their sessions will appear here.
          </Typography>
        </Paper>
      )}
      {sessions.length > 0 && (
        <Grid container spacing={3}>
          {sessions.map((session) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={session.session_id}>
              <StudentCard sessionData={session} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default AdminDashboard; 