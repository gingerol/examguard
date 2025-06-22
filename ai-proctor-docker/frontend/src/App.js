import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link as RouterLink } from 'react-router-dom';
import Webcam from 'react-webcam'; // Unused -> // UNCOMMENTED
import axios from 'axios';
// import { Container, Row, Col, Button, Alert, Tab, Tabs, Table, Form, Nav, Navbar } from 'react-bootstrap'; // Old imports

// MUI Imports
// ThemeProvider, createTheme, CssBaseline are in index.js
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button'; // MUI Button
import Container from '@mui/material/Container'; // MUI Container
// import Grid from '@mui/material/Grid'; // Will be added when used
import Alert from '@mui/material/Alert'; // MUI Alert - to be used later
// import Tabs from '@mui/material/Tabs'; // Unused MUI Tabs
// import Tab from '@mui/material/Tab'; // Unused MUI Tab
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import MuiLink from '@mui/material/Link';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
// Table components will be imported later if needed for the event history table
// Form components will be imported later if needed for login/register

// Keep react-bootstrap components that are still in use, or alias them if names conflict and MUI isn't replacing them yet.
// import { Nav, Navbar as BsNavbar } from 'react-bootstrap'; // Nav and BsNavbar not currently used after AppBar introduction
import { Row, Col } from 'react-bootstrap'; // Table, Form, Tabs, Tab from react-bootstrap are still used for now. Re-evaluating.
// import { Table, Form } from 'react-bootstrap'; // Table and Form are not used at the top level of App.js, Row/Col are. Re-evaluating.
import { Tabs as BsTabs, Tab as BsTab } from 'react-bootstrap'; // Explicitly alias react-bootstrap Tabs/Tab

// Import the new AdminDashboard component
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
// NEW: Import the AdminAlertLog component
import AdminAlertLog from './components/AdminAlertLog/AdminAlertLog';
// NEW: Import StudentSessionDetail component
import StudentSessionDetail from './components/AdminDashboard/StudentSessionDetail';

/* eslint-disable jsx-a11y/media-has-caption */

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://examguard-production-90e5.up.railway.app';

// Define StableWebcam wrapper
const StableWebcam = React.memo(React.forwardRef((props, ref) => {
  return <Webcam {...props} ref={ref} />;
}));

const VIDEO_CONSTRAINTS = { // Defined as a constant
  width: 1280,
  height: 720,
  facingMode: "user"
};

// NEW: AuthPage Component
const AuthPage = ({ 
  showRegister, 
  authMessage, 
  handleRegister, 
  handleLogin, 
  authUsername, 
  setAuthUsername, 
  authPassword, 
  setAuthPassword, 
  authRole,
  setAuthRole,
  setShowRegister, 
  setAuthMessage // Added setAuthMessage to clear on toggle
}) => {
  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Typography component="h1" variant="h5" color="primary">
          {showRegister ? 'Register' : 'Login'}
        </Typography>
        {authMessage.text && (
          <Alert severity={authMessage.type || 'info'} sx={{ width: '100%', mt: 2, mb: 1 }}>
            {authMessage.text}
          </Alert>
        )}
        <Box component="form" onSubmit={showRegister ? handleRegister : handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          {showRegister && (
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={authRole}
                label="Role"
                onChange={(e) => setAuthRole(e.target.value)}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {showRegister ? 'Register' : 'Sign In'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <MuiLink href="#" variant="body2" onClick={() => { setShowRegister(!showRegister); setAuthMessage({ type: '', text: '' }); }}>
                {showRegister ? "Already have an account? Sign in" : "Don't have an account? Sign Up"}
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

// NEW: StudentMonitorPage Component
const StudentMonitorPage = ({
  sessionId,
  isMonitoring,
  toggleMonitoring,
  isTogglingVideo,
  isSessionStarting,
  toggleAudioMonitoring,
  isAudioMonitoring,
  isTogglingAudio,
  syncOfflineData,
  offlineMode,
  offlineData,
  webcamRef,
  status,
  alerts,
  activeTab,
  setActiveTab,
  fetchEvents,
  events
}) => {
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ textAlign: 'center', mb:3 }}>
        AI Proctoring Session: {sessionId}
      </Typography>
      <Row className="mb-3">
        <Col>
          <Button 
            variant="contained" 
            onClick={toggleMonitoring} 
            disabled={isTogglingVideo || (isMonitoring && isSessionStarting)}
            color={isMonitoring ? "error" : "success"}
            sx={{ mr: 1 }}
          >
            {isMonitoring ? 'Stop Video Monitoring' : 'Start Video Monitoring'}
          </Button>
          <Button 
            variant="contained" 
            onClick={toggleAudioMonitoring} 
            disabled={isTogglingAudio}
            color={isAudioMonitoring ? "error" : "success"}
          >
            {isAudioMonitoring ? 'Stop Audio Monitoring' : 'Start Audio Monitoring'}
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="outlined" onClick={syncOfflineData} disabled={!offlineMode || offlineData.length === 0}>
            Sync Offline Data ({offlineData.length})
          </Button>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={8}>
          <Paper elevation={2} sx={{ p:2, position: 'relative', overflow: 'hidden' }}>
            {isMonitoring ? (
              <StableWebcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                width="100%"
                height="auto"
                videoConstraints={VIDEO_CONSTRAINTS}
                mirrored={true}
              />
            ) : (
              <Box sx={{ height: 300, backgroundColor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                <Typography variant="h6" color="textSecondary">Video Monitoring Off</Typography>
              </Box>
            )}
            <Typography variant="caption" sx={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', p:0.5, borderRadius:1 }}>
              Status: {status}
            </Typography>
          </Paper>
        </Col>
        <Col md={4}>
          <Paper elevation={2} sx={{ p:2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Event Log</Typography>
            <BsTabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="event-log-tabs" className="mb-3">
              <BsTab eventKey="monitor" title="Session Alerts">
                <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <Alert severity="warning" key={index} sx={{ mb: 1 }}>{alert.timestamp} - {alert.message}</Alert>
                    ))
                  ) : <Typography>No alerts yet.</Typography>}
                </Box>
              </BsTab>
              <BsTab eventKey="history" title="Full History">
                <Button onClick={fetchEvents} size="small" sx={{mb:1}}>Refresh History</Button>
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {events.length > 0 ? events.map(e => (
                    <Paper key={e._id} elevation={1} sx={{p:1, mb:1, fontSize:'0.8rem'}}>
                      {new Date(e.timestamp).toLocaleString()}: {e.event_type}
                      {e.details && typeof e.details === 'object' && (
                        <pre style={{fontSize:'0.7rem', whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      )}
                    </Paper>
                  )) : <Typography>No history fetched.</Typography>}
                </Box>
              </BsTab>
            </BsTabs>
          </Paper>
        </Col>
      </Row>
    </Container>
  );
};

// NEW: MainContentComponent (defined outside App)
const MainContentComponent = ({
  currentUser,
  determineRedirectPath,
  // Props for AuthPage
  showRegister, authMessage, handleRegister, handleLogin, authUsername, setAuthUsername, authPassword, setAuthPassword, authRole, setAuthRole, setShowRegister, setAuthMessage, // Added setAuthMessage
  // Props for StudentMonitorPage
  sessionId, isMonitoring, toggleMonitoring, isTogglingVideo, isSessionStarting, toggleAudioMonitoring, isAudioMonitoring, isTogglingAudio, syncOfflineData, offlineMode, offlineData, webcamRef, status, alerts, activeTab, setActiveTab, fetchEvents, events
}) => {
  if (!currentUser) {
    return (
      <AuthPage
        showRegister={showRegister}
        authMessage={authMessage}
        handleRegister={handleRegister}
        handleLogin={handleLogin}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authRole={authRole}
        setAuthRole={setAuthRole}
        setShowRegister={setShowRegister}
        setAuthMessage={setAuthMessage} // Pass setAuthMessage
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={determineRedirectPath()} replace />} />
      {currentUser.role === 'student' && (
        <Route path="/student/monitor" element={
          <StudentMonitorPage
            sessionId={sessionId}
            isMonitoring={isMonitoring}
            toggleMonitoring={toggleMonitoring}
            isTogglingVideo={isTogglingVideo}
            isSessionStarting={isSessionStarting}
            toggleAudioMonitoring={toggleAudioMonitoring}
            isAudioMonitoring={isAudioMonitoring}
            isTogglingAudio={isTogglingAudio}
            syncOfflineData={syncOfflineData}
            offlineMode={offlineMode}
            offlineData={offlineData}
            webcamRef={webcamRef}
            status={status}
            alerts={alerts}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            fetchEvents={fetchEvents}
            events={events}
          />
        }/>
      )}
      {currentUser.role === 'admin' && (
        <>
          <Route path="/admin/dashboard" element={<AdminDashboard currentUser={currentUser} />} />
          <Route path="/admin/alerts" element={<AdminAlertLog currentUser={currentUser} />} />
          <Route path="/admin/session/:sessionId" element={<StudentSessionDetail />} />
        </>
      )}
      <Route path="*" element={<Navigate to={determineRedirectPath()} replace />} />
    </Routes>
  );
};

function App() {
  const webcamRef = useRef(null);

  // Attempt to load state from sessionStorage, but validate session integrity
  const [sessionId, setSessionIdInternal] = useState(() => {
    const storedSessionId = sessionStorage.getItem('proctoring_sessionId');
    // Only restore valid backend session IDs, not placeholder frontend IDs
    if (storedSessionId && !storedSessionId.startsWith('session_')) {
      return storedSessionId;
    }
    // Clear invalid session data and generate new placeholder
    sessionStorage.removeItem('proctoring_sessionId');
    sessionStorage.removeItem('proctoring_isMonitoring');
    sessionStorage.removeItem('proctoring_isAudioMonitoring');
    console.log('[Session Restore] Invalid or placeholder session detected, clearing stored state');
    return `session_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  const [isMonitoring, setIsMonitoring] = useState(() => {
    const storedIsMonitoring = sessionStorage.getItem('proctoring_isMonitoring');
    const storedSessionId = sessionStorage.getItem('proctoring_sessionId');
    
    // Only restore monitoring state if we have a valid backend session ID
    if (storedIsMonitoring && storedSessionId && !storedSessionId.startsWith('session_')) {
      console.log('[Session Restore] Restoring valid monitoring state with session:', storedSessionId);
      return JSON.parse(storedIsMonitoring);
    }
    
    // Clear monitoring state if session is invalid
    console.log('[Session Restore] Not restoring monitoring state - invalid session');
    return false;
  });

  // eslint-disable-next-line no-unused-vars
  const [status, setStatus] = useState('Ready');
  const [alerts, setAlerts] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false); // For video button
  const [offlineData, setOfflineData] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');

  // Audio state
  const [isAudioMonitoring, setIsAudioMonitoring] = useState(() => {
    const storedIsAudioMonitoring = sessionStorage.getItem('proctoring_isAudioMonitoring');
    return storedIsAudioMonitoring ? JSON.parse(storedIsAudioMonitoring) : false;
  });
  // const [audioStatusMessage, setAudioStatusMessage] = useState({ type: 'info', text: 'Audio monitoring ready.' }); // Unused
  const [isTogglingAudio, setIsTogglingAudio] = useState(false); // For disabling button during state changes
  const audioStreamRef = useRef(null); // To store MediaStream
  const audioContextRef = useRef(null); // To store AudioContext
  const scriptProcessorNodeRef = useRef(null); // To store ScriptProcessorNode
  const audioSourceNodeRef = useRef(null); // To store MediaStreamAudioSourceNode
  const audioBufferRef = useRef([]); // To store Float32Array audio chunks
  const accumulatedAudioLengthRef = useRef(0); // To store total accumulated samples
  const TARGET_AUDIO_CHUNK_DURATION_SECONDS = 5; // Target duration for each chunk

  // Auth state
  const [currentUser, setCurrentUser] = useState(null); // Will store { token, username, role }
  const [showRegister, setShowRegister] = useState(false); // Controls visibility of registration form - RESTORED
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('student'); // Default role
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' });

  // NEW: State for session start pending
  const [isSessionStarting, setIsSessionStarting] = useState(false);

  // To store interval IDs for clearing
  // const imageCaptureIntervalRef = useRef(null); // REMOVED - This specific ref was unused

  // Effect to save sessionId to sessionStorage whenever it changes
  useEffect(() => {
    // Only store if it's not the placeholder or has been set by backend
    if (sessionId && !sessionId.startsWith('session_')) {
      sessionStorage.setItem('proctoring_sessionId', sessionId);
    }
  }, [sessionId]);

  // Effect to save isMonitoring to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('proctoring_isMonitoring', JSON.stringify(isMonitoring));
  }, [isMonitoring]);

  // Effect to save isAudioMonitoring to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('proctoring_isAudioMonitoring', JSON.stringify(isAudioMonitoring));
  }, [isAudioMonitoring]);

  // Effect to load user from localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('proctoring_token');
    const storedUser = localStorage.getItem('proctoring_user');
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser({ token: storedToken, ...user });
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        localStorage.removeItem('proctoring_token');
        localStorage.removeItem('proctoring_user');
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  // Setup Axios interceptor to include JWT token in requests
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('proctoring_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Setup Axios response interceptor to handle 401 errors (token expiry)
    const responseInterceptor = axios.interceptors.response.use(
      response => response, // Pass through successful responses
      error => {
        if (error.response && error.response.status === 401) {
          // Check if the original request was NOT to the login endpoint
          // to prevent a loop if the login itself fails with 401
          if (error.config.url !== `${API_BASE_URL}/api/auth/login`) {
            console.warn('[AxiosAuth] Received 401 Unauthorized for URL:', error.config.url, 'Logging out.');
            // Use a more specific message for token expiry
            setAuthMessage({ type: 'warning', text: 'Your session has expired. Please log in again.' });
            handleLogout(); // This will clear currentUser and localStorage
          } else {
            // If it was the login endpoint, don't force logout, let login fail normally
            console.log('[AxiosAuth] 401 from login endpoint, not forcing logout.');
          }
        }
        return Promise.reject(error); // Important to reject the error so individual .catch() blocks can still handle it
      }
    );

    // Clean up the interceptors when the component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // currentUser removed from deps to prevent re-running interceptor setup on logout/login
           // handleLogout is memoized by React if it were a useCallback, but here it's fine.

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length);
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  };

  // Helper to add alerts
  const addAlert = useCallback((message, type = 'info', details = null) => {
    const newAlert = {
      id: `alert_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      timestamp: new Date().toISOString(),
      message,
      type, // 'info', 'warning', 'error'
      details // Can be an object with more data, e.g., { look_direction: 'left' }
    };
    setAlerts(prevAlerts => [newAlert, ...prevAlerts].slice(0, 50)); // Keep last 50
    // If it's an error or warning, also log to console for easier debugging
    if (type === 'error') console.error(`Alert: ${message}`, details || '');
    else if (type === 'warning') console.warn(`Alert: ${message}`, details || '');
    else console.log(`Alert: ${message}`, details || '');
  }, []);

  // NEW: Function to start student monitoring session via API
  const startStudentSession = async () => {
    if (!currentUser || !currentUser.token) {
      addAlert("Authentication required to start a session.", "error");
      console.error("[Session Start] No current user or token");
      return;
    }
    setIsSessionStarting(true); // Set starting flag
    const localGeneratedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[Session Start] Attempting to start student session with frontend-generated ID: ${localGeneratedSessionId}`);
    console.log(`[Session Start] API_BASE_URL: ${API_BASE_URL}`);
    console.log(`[Session Start] User token: ${currentUser.token ? 'Present' : 'Missing'}`);

    try {
      // The backend will generate/confirm the actual session_id
      const response = await axios.post(`${API_BASE_URL}/api/student/monitoring/start`,
        { session_id: localGeneratedSessionId }, // Send the frontend-generated ID as a suggestion or for tracking
        {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        }
      );
      console.log(`[Session Start] Backend response:`, response.data);
      const newSessionIdFromServer = response.data.session_id;
      const monitoringStartTime = response.data.monitoring_start_time;
      console.log(`[Session Start] Backend confirmed session. Frontend ID: ${localGeneratedSessionId}, Backend ID: ${newSessionIdFromServer}, Start Time: ${monitoringStartTime}`);

      if (newSessionIdFromServer) {
        setSessionIdInternal(newSessionIdFromServer); // Update with backend-confirmed session ID
        setStatus(`Monitoring session ${newSessionIdFromServer} started.`);
        addAlert(`Monitoring session ${newSessionIdFromServer} started successfully.`, "success");
        setIsSessionStarting(false); // Clear starting flag
        return newSessionIdFromServer; // Return the confirmed ID
      } else {
        console.error("[Session Start] Backend did not return a session_id.", response.data);
        addAlert("Could not start monitoring session with backend: No session ID returned.", "error");
        setIsSessionStarting(false); // Clear starting flag
        return null;
      }
    } catch (error) {
      console.error("[Session Start] Error starting student session:", error.response ? error.response.data : error.message);
      addAlert(error.response?.data?.msg || "Could not start new monitoring session with backend.", "error");
      setIsSessionStarting(false); // Clear starting flag
      return null;
    }
  };

  // NEW: Function to stop student monitoring session via API
  const stopStudentSession = async (currentSessionId) => {
    if (!currentUser || !currentUser.token) {
      addAlert('Authentication token not found. Cannot stop session.', 'error');
      return false;
    }
    // Ensure currentSessionId is a backend-confirmed ID, not a placeholder
    if (!currentSessionId || currentSessionId.startsWith('session_')) {
        addAlert('Cannot stop session: Valid session ID from backend not yet available or session not properly started.', 'error');
        console.warn("Attempted to stop session without a valid backend-confirmed session ID. Current ID:", currentSessionId);
        return false; // Indicate failure to stop with backend
    }
    try {
      await axios.post(`${API_BASE_URL}/api/student/monitoring/stop`, 
        { session_id: currentSessionId }, // Send the current session_id to the backend
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      addAlert(`Monitoring session ${currentSessionId} stopped with backend.`, 'success');
      // Optionally clear the sessionId from state/sessionStorage if a new one should always be generated
      // For now, we keep it, but a fresh login/start might generate a new one.
      // setSessionId(null); // Or `session_${new Date().getTime()}` if we want a placeholder
      // sessionStorage.removeItem('proctoring_sessionId');
      return true;
    } catch (error) {
      console.error("Error stopping student monitoring session:", error);
      const errorMsg = error.response?.data?.msg || "Failed to stop proctoring session with backend.";
      addAlert(errorMsg, 'error');
       if (error.response?.status === 401) {
         addAlert('Authentication error during stop. Please log in again.', 'error');
      }
      return false;
    }
  };

  // eslint-disable-next-line no-unused-vars
  const toggleMonitoring = async () => {
    console.log(`[DEBUG_TOGGLE] Current session ID for toggle: ${sessionId}`);
    setIsTogglingVideo(true);

    if (isMonitoring) { // Trying to stop
      console.log(`[TogglePrevent] Attempting to STOP monitoring. isSessionStarting: ${isSessionStarting}`);
      // Safeguard: Prevent stopping if the session is still in the process of starting.
      if (isSessionStarting) {
        addAlert('Cannot stop: Session is still in the process of starting. Please wait.', 'warning');
        console.warn('[TogglePrevent] Stop prevented: Session is still starting.');
        setIsTogglingVideo(false);
        return;
      }

      // Check if sessionId is actually available. This is a basic sanity check.
      if (!sessionId) {
        addAlert('Cannot stop: Session ID is missing.', 'error');
        console.warn('[TogglePrevent] Stop prevented: sessionId is missing.');
        setIsTogglingVideo(false);
        return;
      }
      
      console.log(`[TogglePrevent] Proceeding to stop session: ${sessionId}`);
      await stopStudentSession(sessionId);
      setStatus("Video Monitoring Off"); // More descriptive
      setIsMonitoring(false);
      // setSessionIdInternal(null); // Explicitly clear session ID on stop. This is handled in stopStudentSession.
      addAlert("Video monitoring stopped.", "info");
      // Stop audio monitoring as well if it's running
      if (isAudioMonitoring) {
        await toggleAudioMonitoring(); // This will handle its own state and snackbars
      }
    } else { // Trying to start
      setStatus('Starting monitoring session with backend...');
      const backendSessionId = await startStudentSession();
      if (backendSessionId) {
        // Successfully started session with backend, now set monitoring to true
        setIsMonitoring(true); // MOVED HERE
        setStatus('Monitoring started.');
        addAlert('Video monitoring started.', 'info');
      } else {
        // Failed to start backend session
        setStatus('Failed to start backend session. Monitoring off.');
        setIsMonitoring(false); // Ensure it's off if session start failed
        addAlert('Could not start video monitoring with backend.', 'error');
      }
    }
    setIsTogglingVideo(false);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) {
      console.warn("Webcam ref not available for captureAndAnalyze.");
      return;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      addAlert('Could not get screenshot from webcam. Webcam might be initializing or blocked.', 'warning');
      console.warn("getScreenshot() returned null or empty.");
      return;
    }

    if (!sessionId || sessionId.startsWith('session_')) {
      console.warn("captureAndAnalyze: Missing or placeholder session_id. Analysis might not be linked to a backend session.", sessionId);
      // Do not addAlert here as it would be too noisy.
      // The startStudentSession should handle alerts related to session ID issues.
    }

    // Debugging image and blob
    console.log("[Debug] captureAndAnalyze: imageSrc length:", imageSrc.length, "starts with:", imageSrc.substring(0, 30));
    
    const base64Data = imageSrc.split(',')[1];
    if (!base64Data) {
      console.log("[Debug] captureAndAnalyze: base64Data is null or empty after split.");
      return;
    }
    const blob = base64ToBlob(base64Data, 'image/jpeg');
    console.log("[Debug] captureAndAnalyze: blob object:", blob);
    
    const formData = new FormData();
    formData.append('image', blob);
    formData.append('session_id', sessionId);
    
    try {
      if (offlineMode) {
        const timestamp = new Date().toISOString();
        setOfflineData(prev => [...prev, { timestamp, imageSrc }]); // Store base64 image for simplicity in offline
        setStatus('Offline monitoring active. Data queued.');
        addAlert('Captured image offline.');
        return; // Skip API call in offline mode
      }

      // Try to connect to backend, default to localhost:5000 for Docker setup
      const response = await axios.post(`${API_BASE_URL}/api/analyze-face`, formData);
      
      if (response.data.warning_multiple_faces) {
        addAlert(`Warning: ${response.data.warning_multiple_faces}`);
      }
      if (response.data.error) {
        addAlert(`Error from backend: ${response.data.error}`);
        setStatus(`Error: ${response.data.error}`);
      } else if (response.data.looking_away) {
        addAlert('Student may be looking away from screen');
        setStatus(`Monitoring: Looking Away (${response.data.eye_status})`);
      } else {
        setStatus(`Monitoring: Attentive (${response.data.eye_status})`);
      }

    } catch (error) {
      console.error('Error analyzing face:', error);
      setStatus('Error: Could not connect to analysis server.');
      if (!offlineMode) {
        setOfflineMode(true);
        addAlert('Switched to offline mode due to connection issues.');
      }
    }
  }, [sessionId, offlineMode, addAlert]);
  
  // Helper function to convert ArrayBuffer to Base64 string
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // WAV Encoding Function
  const encodeWAV = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Helper function to write strings to DataView
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    const numChannels = 1;
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * 2, true); // 2 bytes per sample (16-bit)
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true); // 2 bytes per sample (16-bit)
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // Write the PCM samples (16-bit)
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i])); // Clamp to -1 to 1
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer; // Return ArrayBuffer
  };

  const processAndSendAudioChunk = useCallback((audioBuffers, sampleRate) => {
    try {
      console.log('[AudioChunk] processAndSendAudioChunk called.');
      
      if (!audioBuffers || !Array.isArray(audioBuffers)) {
        console.error('[AudioError] audioBuffers is invalid in processAndSendAudioChunk.', audioBuffers);
        return;
      }
      if (audioBuffers.length === 0) {
        console.warn('[AudioChunk] processAndSendAudioChunk called with empty audioBuffers. Skipping.');
        return;
      }

      // 1. Concatenate buffers
      let totalLength = 0;
      audioBuffers.forEach(buffer => {
        totalLength += buffer.length;
      });
      const concatenatedBuffer = new Float32Array(totalLength);
      let offset = 0;
      audioBuffers.forEach(buffer => {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
      });
      console.log(`[AudioChunk] Concatenated buffer length: ${concatenatedBuffer.length}, Sample rate: ${sampleRate}`);

      // 2. Convert to WAV (encodeWAV function)
      const wavBuffer = encodeWAV(concatenatedBuffer, sampleRate);
      console.log(`[AudioChunk] WAV buffer created, length: ${wavBuffer.byteLength}`);

      // 3. Base64 Encode
      const base64WAV = arrayBufferToBase64(wavBuffer);
      console.log(`[AudioChunk] Base64 WAV data (first 100 chars): ${base64WAV.substring(0, 100)}`);
      console.log(`[AudioChunk] Base64 WAV data length: ${base64WAV.length}`);

      // 4. Send to backend (Sub-Task 2.3)
      const clientTimestampUTC = new Date().toISOString();
      const audioDataPayload = {
        audio_data: base64WAV,
        sample_rate: sampleRate,
        session_id: sessionId, // Assumes sessionId is available in this scope
        client_timestamp_utc: clientTimestampUTC
      };

      axios.post(`${API_BASE_URL}/api/analyze-audio`, audioDataPayload)
        .then(response => {
          console.log('[AudioChunk] Successfully sent audio chunk to backend:', response.data);
        })
        .catch(error => {
          console.error('[AudioChunk] Error sending audio chunk to backend:', error);
          // let errorMsg = 'Failed to send audio chunk.'; // errorMsg is unused as setAudioStatusMessage is commented
          // if (error.response) {
          //   errorMsg = `Server error: ${error.response.data.message || error.response.statusText}`;
          // } else if (error.request) {
          //   errorMsg = 'No response from server. Check connection.';
          // }
        });
    } catch (e) {
      console.error('[AudioError] Error in processAndSendAudioChunk:', e);
    }
  }, [sessionId]);

  // eslint-disable-next-line no-unused-vars
  const toggleAudioMonitoring = useCallback(async () => {
    if (isTogglingAudio) return; // Prevent rapid clicks
    setIsTogglingAudio(true);

    if (!isAudioMonitoring) { // About to start audio monitoring
      setStatus('Starting audio monitoring...');
      addAlert('Audio monitoring started.');
      audioBufferRef.current = []; // Clear any previous buffers
      accumulatedAudioLengthRef.current = 0; // Reset accumulated length
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        
        const context = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = context;

        const source = context.createMediaStreamSource(stream);
        audioSourceNodeRef.current = source;

        // Buffer size, input channels, output channels
        const bufferSize = 4096; 
        const scriptNode = context.createScriptProcessor(bufferSize, 1, 1); // Mono input, mono output
        scriptProcessorNodeRef.current = scriptNode;

        scriptNode.onaudioprocess = (audioProcessingEvent) => {
          try {
            const inputBuffer = audioProcessingEvent.inputBuffer;
            const inputData = inputBuffer.getChannelData(0); // Assuming mono audio

            // It's crucial to copy the data, as the underlying buffer is reused by the browser
            const inputDataCopy = new Float32Array(inputData);
            
            if (!audioBufferRef.current) {
              console.error('[AudioError] audioBufferRef.current is null or undefined in onaudioprocess!');
              audioBufferRef.current = []; // Attempt to recover
            }
            audioBufferRef.current.push(inputDataCopy);
            accumulatedAudioLengthRef.current += inputDataCopy.length;

            // Defensive check for audioContextRef and sampleRate
            if (!audioContextRef.current || !audioContextRef.current.sampleRate) {
              console.error('[AudioError] AudioContext or sampleRate is invalid in onaudioprocess.');
              // Consider stopping or attempting to recover audio context if possible, or just return
              return; 
            }
            const currentSampleRate = audioContextRef.current.sampleRate;
            const samplesPerChunk = TARGET_AUDIO_CHUNK_DURATION_SECONDS * currentSampleRate;

            console.log(`[AudioDebug] Accumulated: ${accumulatedAudioLengthRef.current}, Target: ${samplesPerChunk}, SampleRate: ${currentSampleRate}, BufferSize: ${inputDataCopy.length}`);

            if (accumulatedAudioLengthRef.current >= samplesPerChunk) {
              console.log(`[AudioChunk] Accumulated ${accumulatedAudioLengthRef.current} samples at ${currentSampleRate}Hz, reaching target of ${samplesPerChunk}. Processing chunk.`);
              
              // Make a copy of the buffers to pass, to avoid modification issues if processAndSendAudioChunk is slow or async
              const buffersToProcess = [...audioBufferRef.current];
              audioBufferRef.current = []; // Reset for the next chunk immediately
              accumulatedAudioLengthRef.current = 0; // Reset accumulated length immediately

              processAndSendAudioChunk(buffersToProcess, currentSampleRate);
            }
          } catch (e) {
            console.error('[AudioError] Error in onaudioprocess:', e);
            // Optionally, try to stop audio monitoring gracefully here to prevent repeated errors
            // This might involve calling parts of the cleanup logic from toggleAudioMonitoring
            // For now, just log the error.
          }
        };

        source.connect(scriptNode);
        scriptNode.connect(context.destination); // Necessary to make onaudioprocess fire.

        setIsAudioMonitoring(true);
        addAlert('Audio monitoring started.');
        console.log('[AudioProto] Audio monitoring started successfully.');
        setStatus('Audio monitoring active');

      } catch (err) {
        console.error('[AudioProto] Error accessing microphone:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          addAlert('Microphone access denied. Please enable microphone permissions in your browser settings.');
          setStatus('Audio error: Microphone access denied.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          addAlert('No microphone found. Please connect a microphone and try again.');
          setStatus('Audio error: No microphone found.');
        } else {
          addAlert(`Error accessing microphone: ${err.message}`);
          setStatus(`Audio error: ${err.message}`);
        }
        // Ensure states are reset if setup fails
        setIsAudioMonitoring(false); 
        audioStreamRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(e => console.error("Error closing audio context on fail:", e));
        }
        audioContextRef.current = null;
        scriptProcessorNodeRef.current = null; 
        audioSourceNodeRef.current = null;

      } finally {
        setIsTogglingAudio(false);
      }
    } else { // About to stop audio monitoring
      setStatus('Stopping audio monitoring...');
      addAlert('Audio monitoring stopped.');
      if (scriptProcessorNodeRef.current && audioSourceNodeRef.current) {
        audioSourceNodeRef.current.disconnect(scriptProcessorNodeRef.current);
        scriptProcessorNodeRef.current.disconnect(); // Disconnect from context.destination
        scriptProcessorNodeRef.current.onaudioprocess = null; // Remove the handler
        scriptProcessorNodeRef.current = null;
      }
      if (audioSourceNodeRef.current) {
        audioSourceNodeRef.current.disconnect();
        audioSourceNodeRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing audio context:", e));
        audioContextRef.current = null;
      }
      
      setIsAudioMonitoring(false);
      console.log('[AudioProto] Audio monitoring stopped.');
      audioBufferRef.current = []; // Clear buffers
      accumulatedAudioLengthRef.current = 0; // Reset length
      setStatus(isMonitoring ? 'Video monitoring active' : 'Ready');
      setIsTogglingAudio(false);
    }
  }, [isAudioMonitoring, isTogglingAudio, addAlert, processAndSendAudioChunk, setStatus, isMonitoring]);

  const syncOfflineData = useCallback(async () => {
    if (offlineData.length === 0) {
      addAlert('No offline data to sync.');
      return;
    }
    setStatus('Syncing offline data...');
    let syncedCount = 0;
    const remainingData = [...offlineData]; // Create a copy to modify

    for (let i = 0; i < offlineData.length; i++) {
        const record = offlineData[i];
        const formData = new FormData();
        const blob = base64ToBlob(record.imageSrc.split(',')[1], 'image/jpeg');
        formData.append('image', blob);
        formData.append('session_id', sessionId); // Add session_id for offline sync too
        // Add timestamp if your backend can use it for offline records
        // formData.append('client_timestamp_utc', record.timestamp); 
        try {
            await axios.post(`${API_BASE_URL}/api/analyze-face`, formData);
            syncedCount++;
            // Remove successfully synced item from the copy
            const originalIndex = remainingData.findIndex(item => item.timestamp === record.timestamp && item.imageSrc === record.imageSrc);
            if (originalIndex > -1) {
                remainingData.splice(originalIndex, 1);
            }
        } catch (error) {
            addAlert(`Failed to sync an offline record: ${error.message}`);
        }
    }
    setStatus(`Synced ${syncedCount} of ${offlineData.length} records.`);
    setOfflineData(remainingData);
    if (remainingData.length === 0) {
        setOfflineMode(false);
        addAlert('All offline data synced. Resuming online mode.');
    } else if (syncedCount > 0) {
         addAlert(`${syncedCount} records synced. ${remainingData.length} records remain offline.`);
    } else {
        addAlert('Offline data sync failed. Please try again later.');
    }
  }, [offlineData, addAlert, sessionId, setStatus, setOfflineData, setOfflineMode]);
  
  useEffect(() => {
    let intervalId = null;
    console.log(`[CaptureIntervalEffect] Evaluating. isMonitoring: ${isMonitoring}, sessionId: ${sessionId}`);

    if (isMonitoring) {
      // Check if sessionId exists AND is not a frontend placeholder
      if (sessionId && !sessionId.startsWith('session_')) {
        console.log(`[CaptureIntervalEffect] Starting interval for valid backend session: ${sessionId}`);
        captureAndAnalyze(); // Initial call
        intervalId = setInterval(captureAndAnalyze, 5000);
      } else {
        console.warn(`[CaptureIntervalEffect] Monitoring is ON, but sessionId is invalid or placeholder: ${sessionId}. Stopping monitoring to prevent ghost sessions.`);
        // Stop monitoring if sessionId is a placeholder - prevents ghost monitoring
        setIsMonitoring(false);
        sessionStorage.removeItem('proctoring_isMonitoring');
        addAlert('Monitoring stopped: No valid backend session found. Please start monitoring properly.', 'warning');
      }
    } else {
      console.log("[CaptureIntervalEffect] Monitoring is OFF. Ensuring interval is cleared.");
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        console.log(`[CaptureIntervalEffect] Clearing interval ID: ${intervalId}`);
        clearInterval(intervalId);
      }
    };
  }, [isMonitoring, sessionId, captureAndAnalyze, setIsMonitoring, addAlert]); // captureAndAnalyze is memoized
  
  const fetchEvents = async () => {
    // if (!sessionId) return; // Removed this check, admin might not have a relevant session_id to filter by initially
    try {
      let url = `${API_BASE_URL}/api/events?limit=100`;
      // For admins, fetch all events unless a specific session_id filter is implemented later
      // For students, it might make sense to only fetch their own session_id if this view were available to them
      // However, current logic hides this tab for students.
      // if (currentUser && currentUser.role !== 'admin' && sessionId) {
      //   url = `${API_BASE_URL}/api/events?session_id=${sessionId}&limit=100`;
      // }
      // For now, admin sees all events. If a filter is added later, this logic will need to adapt.
      const response = await axios.get(url);
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      addAlert("Failed to load event history.");
    }
  };

  useEffect(() => {
    let eventInterval;
    if (activeTab === 'events') {
      fetchEvents(); // Fetch immediately when tab is switched
      eventInterval = setInterval(fetchEvents, 5000); // Refresh every 5 seconds
    }
    return () => clearInterval(eventInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sessionId]);

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthMessage({ type: '', text: '' });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { 
        username: authUsername, 
        password: authPassword 
      });
      const { access_token, username, role } = response.data;
      localStorage.setItem('proctoring_token', access_token);
      localStorage.setItem('proctoring_user', JSON.stringify({ username, role }));
      setCurrentUser({ token: access_token, username, role });
      setAuthUsername('');
      setAuthPassword('');
      // No need to explicitly setShowLogin(false), !currentUser will handle it
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Login failed. Please check your credentials or server connection.";
      setAuthMessage({ type: 'danger', text: errorMsg });
      console.error("Login error:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthMessage({ type: '', text: '' });
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, { 
        username: authUsername, 
        password: authPassword,
        role: authRole
      });
      setAuthMessage({ type: 'success', text: 'Registration successful! Please login.' });
      setShowRegister(false); // Switch to login view
      setAuthUsername(''); // Clear username for login form
      setAuthPassword('');
      setAuthRole('student'); // Reset role to default
    } catch (error) {
      const errorMsg = error.response?.data?.msg || "Registration failed. Please try a different username or check server.";
      setAuthMessage({ type: 'danger', text: errorMsg });
      console.error("Registration error:", error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('proctoring_token');
    localStorage.removeItem('proctoring_user');
    // setShowLogin(true); // This is implicitly handled by !currentUser condition
    // Do not clear authUsername and authPassword here, user might want to retry login
    // setAuthUsername(''); 
    // setAuthPassword('');
    // setAuthMessage({ type: '', text: '' }); // Message is set by interceptor or login/register handlers
    console.log('[Auth] User logged out.');
  };

  const determineRedirectPath = () => {
    if (!currentUser) return "/login"; // Or wherever you want unauthenticated users to go
    if (currentUser.role === 'admin') return "/admin/dashboard"; // Admins go to dashboard
    if (currentUser.role === 'student') return "/student/monitor"; // Students go to their monitoring page
    return "/"; // Fallback
  };

  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ExamGuard AI Proctor
          </Typography>
          {currentUser ? (
            <>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>
                Welcome, {currentUser.username} ({currentUser.role})
              </Typography>
              {currentUser.role === 'admin' && (
                <>
                  <Button color="inherit" component={RouterLink} to="/admin/dashboard">
                    Dashboard
                  </Button>
                  {/* NEW: Admin Alert Log Link */}
                  <Button color="inherit" component={RouterLink} to="/admin/alerts">
                    Alert Log
                  </Button>
                </>
              )}
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              {/* AuthPage handles login/register links */}
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <MainContentComponent
        currentUser={currentUser}
        determineRedirectPath={determineRedirectPath}
        // AuthPage props
        showRegister={showRegister}
        authMessage={authMessage}
        handleRegister={handleRegister}
        handleLogin={handleLogin}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authRole={authRole}
        setAuthRole={setAuthRole}
        setShowRegister={setShowRegister}
        setAuthMessage={setAuthMessage} // Pass setAuthMessage
        // StudentMonitorPage props
        sessionId={sessionId}
        isMonitoring={isMonitoring}
        toggleMonitoring={toggleMonitoring}
        isTogglingVideo={isTogglingVideo}
        isSessionStarting={isSessionStarting}
        toggleAudioMonitoring={toggleAudioMonitoring}
        isAudioMonitoring={isAudioMonitoring}
        isTogglingAudio={isTogglingAudio}
        syncOfflineData={syncOfflineData}
        offlineMode={offlineMode}
        offlineData={offlineData}
        webcamRef={webcamRef}
        status={status}
        alerts={alerts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fetchEvents={fetchEvents}
        events={events}
      />

    </Router>
  );
}

export default App;