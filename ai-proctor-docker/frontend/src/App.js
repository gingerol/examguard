import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Container, Row, Col, Button, Alert, Tab, Tabs, Table, Form, Nav, Navbar } from 'react-bootstrap';
// Ensure 'bootstrap/dist/css/bootstrap.min.css' is imported in index.js or here

function App() {
  const webcamRef = useRef(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [alerts, setAlerts] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineData, setOfflineData] = useState([]);
  const [sessionId, setSessionId] = useState(`session_${new Date().getTime()}`);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');

  // Auth state
  const [currentUser, setCurrentUser] = useState(null); // Will store { token, username, role }
  const [showLogin, setShowLogin] = useState(true); // Show login form by default if not authenticated
  const [showRegister, setShowRegister] = useState(false); // Controls visibility of registration form
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' });

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
    const interceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('proctoring_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );
    // Clean up the interceptor when the component unmounts
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []); // Empty dependency array, so it runs once on mount

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

  const addAlert = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setAlerts(prev => [...prev, { timestamp, message }].slice(-5)); // Keep last 5 alerts
  };

  const captureAndAnalyze = async () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    const base64Data = imageSrc.split(',')[1];
    const blob = base64ToBlob(base64Data, 'image/jpeg');
    
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
      const response = await axios.post('http://localhost:5000/api/analyze-face', formData);
      
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
  };
  
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) { // About to start
      setStatus('Starting monitoring...');
      setAlerts([]); // Clear previous alerts
    } else { // About to stop
      setStatus('Monitoring stopped.');
    }
  };
  
  const syncOfflineData = async () => {
    if (offlineData.length === 0) {
      addAlert('No offline data to sync.');
      return;
    }
    setStatus('Syncing offline data...');
    let syncedCount = 0;
    for (const record of offlineData) {
      const formData = new FormData();
      const blob = base64ToBlob(record.imageSrc.split(',')[1], 'image/jpeg');
      formData.append('image', blob);
      try {
        // Assuming the same endpoint for sync, or a dedicated one could be made
        await axios.post('http://localhost:5000/api/analyze-face', formData);
        syncedCount++;
      } catch (error) {
        addAlert(`Failed to sync an offline record: ${error.message}`);
        // Decide if to keep failed records or discard
      }
    }
    setStatus(`Synced ${syncedCount} of ${offlineData.length} records.`);
    setOfflineData(prev => prev.filter((_, i) => i >= syncedCount)); // Remove synced/attempted records
    if (syncedCount === offlineData.length) {
        setOfflineMode(false); // Go back online if all synced
        addAlert('All offline data synced. Resuming online mode.');
    } else {
        addAlert('Some offline data failed to sync.');
    }
  };
  
  useEffect(() => {
    let interval;
    if (isMonitoring) {
      captureAndAnalyze(); // Analyze immediately when monitoring starts
      interval = setInterval(captureAndAnalyze, 5000); // Then every 5 seconds
    }
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, offlineMode]); // Rerun if isMonitoring or offlineMode changes
  
  const fetchEvents = async () => {
    if (!sessionId) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/events?session_id=${sessionId}&limit=100`);
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
      const response = await axios.post('http://localhost:5000/api/auth/login', { 
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
      await axios.post('http://localhost:5000/api/auth/register', { 
        username: authUsername, 
        password: authPassword 
        // Role defaults to 'student' on the backend
      });
      setAuthMessage({ type: 'success', text: 'Registration successful! Please login.' });
      setShowRegister(false); // Switch to login view
      setAuthUsername(''); // Clear username for login form
      setAuthPassword('');
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
    setAuthUsername('');
    setAuthPassword('');
    setAuthMessage({ type: '', text: '' });
  };

  // Render Login/Register forms if not authenticated
  if (!currentUser) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
            <h2 className="text-center mb-4">{showRegister ? 'Register' : 'Login'}</h2>
            {authMessage.text && <Alert variant={authMessage.type || 'info'}>{authMessage.text}</Alert>}
            <Form onSubmit={showRegister ? handleRegister : handleLogin}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Username</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter username" 
                  value={authUsername} 
                  onChange={(e) => setAuthUsername(e.target.value)} 
                  required 
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formBasicPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder="Password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  required 
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100">
                {showRegister ? 'Register' : 'Login'}
              </Button>
            </Form>
            <Button 
              variant="link" 
              onClick={() => { 
                setShowRegister(!showRegister); 
                setAuthMessage({ type: '', text: '' }); 
                setAuthUsername(''); 
                setAuthPassword(''); 
              }} 
              className="mt-3 d-block text-center"
            >
              {showRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </Button>
          </Col>
        </Row>
      </Container>
    );
  }

  // Main application UI (if authenticated)
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="#">AI Proctoring System</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              {currentUser && <Navbar.Text className="me-3">Signed in as: {currentUser.username} ({currentUser.role})</Navbar.Text>}
              {currentUser && <Button variant="outline-light" onClick={handleLogout}>Logout</Button>}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-4">
        <h1 className="text-center mb-4">AI Proctoring System</h1>
        <p className="text-center text-muted mb-3">Session ID: {sessionId}</p>

        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="proctoring-tabs" className="mb-3">
          <Tab eventKey="monitor" title="Monitoring">
            <Row className="justify-content-center mb-3">
              <Col md={8} lg={6}>
                <div className="position-relative border bg-light p-2" style={{ minHeight: '380px' }}>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    height="auto"
                    videoConstraints={{
                      width: { ideal: 640 },
                      height: { ideal: 480 },
                      facingMode: "user"
                    }}
                    className="img-fluid"
                  />
                  {offlineMode && (
                    <div className="position-absolute top-0 end-0 m-2 p-2 bg-warning text-dark rounded shadow-sm">
                      <strong>OFFLINE MODE</strong>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
            
            <Row className="justify-content-center mb-3">
              <Col md={8} lg={6} className="d-flex justify-content-around">
                <Button 
                  variant={isMonitoring ? "danger" : "success"} 
                  onClick={toggleMonitoring}
                  size="lg"
                >
                  {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                </Button>
                
                {offlineMode && (
                  <Button 
                    variant="primary" 
                    onClick={syncOfflineData}
                    disabled={offlineData.length === 0}
                    size="lg"
                  >
                    Sync Data ({offlineData.length})
                  </Button>
                )}
              </Col>
            </Row>
            
            <Row className="justify-content-center">
              <Col md={8} lg={6}>
                <Alert variant={status.startsWith('Error') ? 'danger' : (offlineMode ? 'warning' : 'info')} className="mt-3 text-center">
                  <strong>Status:</strong> {status}
                </Alert>
                
                <div className="mt-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <h5 className="text-center">Event Log:</h5>
                  {alerts.length === 0 && <p className="text-center text-muted">No events yet.</p>}
                  {alerts.map((alert, index) => (
                    <Alert key={index} variant="light" className="p-2 mb-2">
                      <small><em>{alert.timestamp}</em>: {alert.message}</small>
                    </Alert>
                  ))}
                </div>
              </Col>
            </Row>
          </Tab>
          {currentUser && currentUser.role === 'admin' && (
            <Tab eventKey="events" title="Event History">
              <Row className="justify-content-center mb-3">
                <Col md={10} lg={8}>
                  <Button variant="secondary" onClick={fetchEvents} className="mb-3">Refresh Events</Button>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Event Type</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center">No events recorded for this session yet.</td>
                        </tr>
                      )}
                      {events.map((event) => (
                        <tr key={event._id}>
                          <td>{new Date(event.timestamp).toLocaleString()}</td>
                          <td>{event.event_type}</td>
                          <td>
                            {typeof event.details === 'object' ? (
                              <ul className="list-unstyled mb-0">
                                {event.details.eye_status && <li>Eye Status: {event.details.eye_status}</li>}
                                {typeof event.details.looking_away !== 'undefined' && <li>Looking Away: {event.details.looking_away.toString()}</li>}
                                {typeof event.details.face_count !== 'undefined' && <li>Face Count: {event.details.face_count}</li>}
                                {!event.details.eye_status && !event.details.looking_away && !event.details.face_count && <span>{JSON.stringify(event.details)}</span>}
                              </ul>
                            ) : (
                              event.details
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </Tab>
          )}
        </Tabs>
      </Container>
    </>
  );
}

export default App; 