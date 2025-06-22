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

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://examguard-production-90e5.up.railway.app';

// Alert component for Snackbar
const SnackAlert = React.forwardRef(function SnackAlert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const AdminDashboard = ({ currentUser }) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // State for Snackbar notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // 'success', 'error', 'warning', 'info'

  const handleShowSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleNewSession = useCallback((newSessionData) => {
    console.log("[SocketIO] Received new_student_session_started:", newSessionData);
    setSessions(prevSessions => {
      // Avoid duplicates: if session_id already exists, update it, otherwise add new.
      const existingSessionIndex = prevSessions.findIndex(s => s.session_id === newSessionData.session_id);
      if (existingSessionIndex > -1) {
        const updatedSessions = [...prevSessions];
        updatedSessions[existingSessionIndex] = newSessionData;
        return updatedSessions;
      }
      return [newSessionData, ...prevSessions];
    });
    handleShowSnackbar(`New session started: ${newSessionData.student_name || 'Unknown Student'}`, 'info');
  }, [handleShowSnackbar]);

  const handleSessionEnded = useCallback((data) => {
    console.log("[SocketIO] Received student_session_ended:", data);
    setSessions(prevSessions => prevSessions.filter(s => s.session_id !== data.session_id));
    // Optional: Find the session to display name in snackbar
    // This requires sessions to be up-to-date or pass student_name in event
    // For simplicity, we'll just use session_id for now if name isn't readily available.
    handleShowSnackbar(`Session ${data.session_id} ended.`, 'warning');
  }, [handleShowSnackbar]);

  const handleSessionUpdate = useCallback((updatedSessionData) => {
    console.log("[SocketIO] Received student_session_update:", updatedSessionData);
    setSessions(prevSessions => 
      prevSessions.map(s => 
        s.session_id === updatedSessionData.session_id ? { ...s, ...updatedSessionData } : s
      )
    );
    // Check if this update contains new alert details from the backend
    if (updatedSessionData.new_alert_details) {
      handleShowSnackbar(
        `Alert for ${updatedSessionData.student_name || 'student'}: ${updatedSessionData.new_alert_details.summary}`,
        'error' 
      );
    } else if (updatedSessionData.unread_alert_count && updatedSessionData.unread_alert_count > (sessions.find(s => s.session_id === updatedSessionData.session_id)?.unread_alert_count || 0)) {
      // Fallback if new_alert_details isn't sent, but unread_alert_count increased
      handleShowSnackbar(
        `New activity for ${updatedSessionData.student_name || `Session ${updatedSessionData.session_id}`}`,
        'warning'
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [handleShowSnackbar]);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = currentUser?.token;
        if (!token) {
            console.error("[Auth Error] Authentication token not found for fetching sessions.");
            handleShowSnackbar("Authentication token not found. Please login again.", "error");
            setIsLoading(false);
            setSessions([]); // Clear sessions if auth fails
            return;
        }
        const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard/active_sessions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(response.data || []);
        setError(null); // Clear error on successful fetch
      } catch (err) {
        console.error("Error fetching active sessions:", err);
        let errorMessage = "Could not fetch active sessions.";
        if (err.response) {
          errorMessage = err.response.data?.msg || err.response.data?.error || errorMessage;
          if (err.response.status === 401) {
            errorMessage = "Unauthorized: Invalid or expired token. Please login again.";
          } else if (err.response.status === 403) {
            errorMessage = "Forbidden: You may not have admin privileges to view this page.";
          }
        } else if (err.request) {
          errorMessage = "Network error: Could not connect to the server.";
        }
        setError(errorMessage); // Set specific error message
        handleShowSnackbar(errorMessage, "error");
        setSessions([]); // Clear sessions on error
      }
      setIsLoading(false);
    };

    fetchActiveSessions();

    // WebSocket connection logic
    const tokenForSocket = currentUser?.token;

    if (tokenForSocket) {
      if (!socketRef.current || socketRef.current.disconnected) { // Connect if no socket or if disconnected
        console.log("[SocketIO] Attempting to connect/reconnect WebSocket with token...");
        
        // If there's an old socket, ensure it's fully cleaned up before creating a new one
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current.off(); // Remove all listeners
            socketRef.current = null;
        }

        const newSocket = io(`${API_BASE_URL}/ws/admin_dashboard`, {
          query: { token: `Bearer ${tokenForSocket}` },
          transports: ['websocket'],
          reconnectionAttempts: 5, // Limit reconnection attempts
          reconnectionDelay: 3000, // Delay between attempts
        });

        newSocket.on('connect', () => {
          console.log(`[SocketIO] Connected to admin dashboard namespace with SID: ${newSocket.id}`);
          handleShowSnackbar('WebSocket Connected!', 'success');
        });

        newSocket.on('connection_ack', (data) => {
          console.log('[SocketIO] Connection Acknowledged:', data.message);
        });
        
        newSocket.on('disconnect', (reason) => {
          console.log(`[SocketIO] Disconnected from admin dashboard: ${reason}`);
          if (reason !== 'io client disconnect' && reason !== 'io server disconnect') { 
              handleShowSnackbar('WebSocket Disconnected. Will attempt to reconnect.', 'warning');
          } else {
              handleShowSnackbar('WebSocket Disconnected.', 'info');
          }
        });

        newSocket.on('connect_error', (err) => {
          console.error(`[SocketIO] Connection Error: ${err.message}`, err.data || '');
          const wsErrorMsg = `WebSocket connection error: ${err.message}. Real-time updates may be affected.`;
          setError(prevError => prevError ? `${prevError} ${wsErrorMsg}` : wsErrorMsg);
          handleShowSnackbar(wsErrorMsg, 'error');
        });

        newSocket.on('new_student_session_started', handleNewSession);
        newSocket.on('student_session_ended', handleSessionEnded);
        newSocket.on('student_session_update', handleSessionUpdate);
        
        socketRef.current = newSocket;
      }
    } else {
      console.warn("[SocketIO] No token found, WebSocket connection not attempted or explicitly disconnected.");
      if (socketRef.current) {
        console.log("[SocketIO] Disconnecting WebSocket due to missing token.");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const authErrorMsg = "WebSocket connection requires authentication. Please login.";
      if (!error?.includes(authErrorMsg)) { // Show snackbar only if error is not already shown
        handleShowSnackbar(authErrorMsg, 'error');
      }
    }

    return () => {
      if (socketRef.current && socketRef.current.connected) { // Only disconnect if connected
        console.log("[SocketIO] Cleaning up WebSocket connection on component unmount or token change.");
        socketRef.current.disconnect(); 
        socketRef.current = null; // Ensure ref is cleared
      }
    };
  }, [currentUser?.token, handleNewSession, handleSessionEnded, handleSessionUpdate, handleShowSnackbar, error]);

  if (isLoading && !sessions.length) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading active sessions...</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography component="h1" variant="h4" color="primary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Admin Dashboard - Active Student Sessions
      </Typography>
      {error && ( // Display error more prominently if it exists
        <Alert severity="error" sx={{ mb: 2, '& .MuiAlert-message': { flexGrow: 1 } }}> 
          <Typography variant="h6" component="div">Dashboard Error</Typography>
          {error}
        </Alert>
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
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <SnackAlert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </SnackAlert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard; 