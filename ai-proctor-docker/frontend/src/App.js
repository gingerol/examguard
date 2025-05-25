import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Container, Row, Col, Button, Alert, Tab, Tabs, Table } from 'react-bootstrap';
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

  return (
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
      </Tabs>
    </Container>
  );
}

export default App; 