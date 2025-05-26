import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Container, Row, Col, Button, Alert, Tab, Tabs, Table, Form, Nav, Navbar } from 'react-bootstrap';
// Ensure 'bootstrap/dist/css/bootstrap.min.css' is imported in index.js or here

/* eslint-disable jsx-a11y/media-has-caption */

function App() {
  const webcamRef = useRef(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [alerts, setAlerts] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false); // For video button
  const [offlineData, setOfflineData] = useState([]);
  const [sessionId, /* eslint-disable-next-line no-unused-vars */ setSessionId] = useState(`session_${new Date().getTime()}`);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');

  // Audio state
  const [isAudioMonitoring, setIsAudioMonitoring] = useState(false);
  const [audioStatusMessage, setAudioStatusMessage] = useState({ type: 'info', text: 'Audio monitoring ready.' });
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
  // const [showLogin, setShowLogin] = useState(true); // Commented out as per ESLint, visibility driven by currentUser
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
          if (error.config.url !== 'http://localhost:5000/api/auth/login') {
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
    if (isTogglingVideo) return;
    setIsTogglingVideo(true);

    setIsMonitoring(prevIsMonitoring => {
      const newIsMonitoring = !prevIsMonitoring;
      if (newIsMonitoring) { // About to start
        setStatus('Starting monitoring...');
        setAlerts([]); // Clear previous alerts
      } else { // About to stop
        setStatus('Monitoring stopped.');
      }
      setIsTogglingVideo(false); // Set back regardless of outcome for simplicity here
      return newIsMonitoring;
    });
  };

  const toggleAudioMonitoring = async () => {
    if (isTogglingAudio) return; // Prevent rapid clicks
    setIsTogglingAudio(true);

    if (!isAudioMonitoring) { // About to start audio monitoring
      setAudioStatusMessage({ type: 'info', text: 'Starting audio monitoring...' });
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
        setAudioStatusMessage({ type: 'success', text: 'Audio monitoring active.' });
        console.log('[AudioProto] Audio monitoring started successfully.');

      } catch (err) {
        console.error('[AudioProto] Error accessing microphone:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setAudioStatusMessage({ type: 'error', text: 'Microphone access denied by user. Please enable microphone permissions in your browser settings.' });
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setAudioStatusMessage({ type: 'error', text: 'No microphone found. Please connect a microphone and try again.' });
        } else {
          setAudioStatusMessage({ type: 'error', text: `Error accessing microphone: ${err.message}` });
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
      setAudioStatusMessage({ type: 'info', text: 'Stopping audio monitoring...' });
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
      // addAlert('Audio monitoring stopped.'); // Replaced by audioStatusMessage
      setAudioStatusMessage({ type: 'info', text: 'Audio monitoring stopped.' });
      console.log('[AudioProto] Audio monitoring stopped.');
      audioBufferRef.current = []; // Clear buffers
      accumulatedAudioLengthRef.current = 0; // Reset length
      setIsTogglingAudio(false);
    }
  };

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

  const processAndSendAudioChunk = (audioBuffers, sampleRate) => {
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
        audio_chunk_base64: base64WAV,
        sample_rate: sampleRate,
        session_id: sessionId, // Assumes sessionId is available in this scope
        client_timestamp_utc: clientTimestampUTC
      };

      axios.post('http://localhost:5000/api/analyze-audio', audioDataPayload)
        .then(response => {
          console.log('[AudioChunk] Successfully sent audio chunk to backend:', response.data);
          setAudioStatusMessage({ 
            type: 'success', 
            text: `Audio chunk (${(totalLength / sampleRate).toFixed(1)}s) sent. Server: ${response.data.message || 'Processed'}.` 
          });
        })
        .catch(error => {
          console.error('[AudioChunk] Error sending audio chunk to backend:', error);
          let errorMsg = 'Failed to send audio chunk.';
          if (error.response) {
            errorMsg = `Server error: ${error.response.data.message || error.response.statusText}`;
          } else if (error.request) {
            errorMsg = 'No response from server. Check connection.';
          }
          setAudioStatusMessage({ 
            type: 'error', 
            text: `Error sending audio: ${errorMsg}` 
          });
        });
    } catch (e) {
      console.error('[AudioError] Error in processAndSendAudioChunk:', e);
      setAudioStatusMessage({ 
        type: 'error', 
        text: `Critical error processing audio chunk: ${e.message}` 
      });
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
    // if (!sessionId) return; // Removed this check, admin might not have a relevant session_id to filter by initially
    try {
      let url = 'http://localhost:5000/api/events?limit=100';
      // For admins, fetch all events unless a specific session_id filter is implemented later
      // For students, it might make sense to only fetch their own session_id if this view were available to them
      // However, current logic hides this tab for students.
      // if (currentUser && currentUser.role !== 'admin' && sessionId) {
      //   url = `http://localhost:5000/api/events?session_id=${sessionId}&limit=100`;
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
    // Do not clear authUsername and authPassword here, user might want to retry login
    // setAuthUsername(''); 
    // setAuthPassword('');
    // setAuthMessage({ type: '', text: '' }); // Message is set by interceptor or login/register handlers
    console.log('[Auth] User logged out.');
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
              <Col md={8} lg={6} className="d-flex flex-column align-items-center">
                {currentUser && currentUser.role === 'student' && (
                  <>
                    <Button onClick={toggleMonitoring} variant={isMonitoring ? "danger" : "success"} className="me-2" disabled={isTogglingAudio || isTogglingVideo}>
                      {isMonitoring ? 'Stop Video Monitoring' : 'Start Video Monitoring'}
                    </Button>
                    <Button onClick={toggleAudioMonitoring} variant={isAudioMonitoring ? "danger" : "success"} disabled={isTogglingAudio}>
                      {isAudioMonitoring ? 'Stop Sound Monitoring' : 'Start Sound Monitoring'}
                    </Button>
                  </>
                )}
                {currentUser && currentUser.role === 'admin' && (
                  <>
                    <Button 
                      variant={isMonitoring ? "danger" : "success"} 
                      onClick={toggleMonitoring}
                      size="lg"
                      className="mb-2 w-100"
                    >
                      {isMonitoring ? "Stop Face Monitoring" : "Start Face Monitoring"}
                    </Button>
                    
                    <Button 
                      variant={isAudioMonitoring ? "warning" : "info"} 
                      onClick={toggleAudioMonitoring}
                      size="lg"
                      className="mb-2 w-100"
                    >
                      {isAudioMonitoring ? 'Stop Sound Monitoring' : 'Start Sound Monitoring'}
                    </Button>
                  </>
                )}

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
                {audioStatusMessage && audioStatusMessage.text && 
                  <Alert variant={audioStatusMessage.type} className="mt-2 text-center">
                    <strong>Audio Status:</strong> {audioStatusMessage.text}
                  </Alert>
                }
                
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
              <Row className="mt-3">
                <Col>
                  <h4>All Event Logs</h4>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Session ID</th>
                        <th>Event Type</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event, index) => (
                        <tr key={event._id || index}>
                          <td>{index + 1}</td>
                          <td>{new Date(event.timestamp).toLocaleString()}</td>
                          <td>{event.username}</td>
                          <td>{event.session_id}</td>
                          <td>{event.event_type}</td>
                          <td>
                            {typeof event.details === 'object' && event.details !== null ? (
                              <ul style={{ paddingLeft: '15px', marginBottom: '0' }}>
                                {Object.entries(event.details).map(([key, value]) => {
                                  let displayValue = value;
                                  if (key === 'peak_rms_dbfs' || key === 'average_rms_dbfs') {
                                    displayValue = typeof value === 'number' ? value.toFixed(2) : value;
                                  } else if (key === 'original_filepath' && typeof value === 'string') {
                                    displayValue = value.substring(value.lastIndexOf('/') + 1);
                                  } else if (value === true) {
                                    displayValue = 'Yes';
                                  } else if (value === false) {
                                    displayValue = 'No';
                                  }
                                  const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                                  return <li key={key}>{`${displayKey}: ${displayValue}`}</li>;
                                })}
                                {(event.event_type === 'loud_noise_detected' || event.event_type === 'audio_chunk_saved') && 
                                 event.details && (event.details.original_filepath || event.details.filepath) && (
                                  <li>
                                    <Button 
                                      variant="info" 
                                      size="sm"
                                      className='mt-1'
                                      onClick={async () => {
                                        const filename = event.details.original_filepath 
                                                       ? event.details.original_filepath.substring(event.details.original_filepath.lastIndexOf('/') + 1)
                                                       : event.details.filepath.substring(event.details.filepath.lastIndexOf('/') + 1);
                                        const token = localStorage.getItem('proctoring_token');
                                        if (!token) {
                                          console.error('No access token found for playing audio. Key used: proctoring_token');
                                          addAlert('Error: Not authorized to play audio. Please log in again.');
                                          return;
                                        }
                                        try {
                                          console.log(`[AudioPlayback] Attempting to play: ${filename}`);
                                          const response = await fetch(`/api/audio_files/${filename}`, {
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });

                                          console.log('[AudioPlayback] Response status:', response.status);
                                          console.log('[AudioPlayback] Response headers:');
                                          response.headers.forEach((value, name) => {
                                            console.log(`  ${name}: ${value}`);
                                          });

                                          if (!response.ok) {
                                            let errorText = `Failed to fetch audio: ${response.status}`;
                                            try {
                                                const errorData = await response.json(); // Try to parse as JSON first
                                                errorText = errorData.msg || JSON.stringify(errorData);
                                            } catch (e) {
                                                // If not JSON, try to get text
                                                errorText = await response.text();
                                            }
                                            console.error('[AudioPlayback] Fetch error response text:', errorText);
                                            throw new Error(`Server error: ${errorText}`);
                                          }
                                          const originalBlob = await response.blob();
                                          console.log('[AudioPlayback] Original blob size:', originalBlob.size);
                                          console.log('[AudioPlayback] Original blob type:', originalBlob.type);
                                          
                                          // Ensure the blob has the correct MIME type for WAV audio
                                          const audioBlob = new Blob([originalBlob], { type: 'audio/wav' });
                                          console.log('[AudioPlayback] New audioBlob size:', audioBlob.size);
                                          console.log('[AudioPlayback] New audioBlob type:', audioBlob.type);

                                          if (originalBlob.size === 0) {
                                            throw new Error("Received empty audio file from server.");
                                          }
                                          if (originalBlob.type && !originalBlob.type.startsWith('audio/')) {
                                            // If the server sends a content-type, and it's not audio, that's a problem.
                                            // However, if it's empty, we proceed and hope for the best with 'audio/wav'.
                                            console.warn(`[AudioPlayback] Suspicious content type from server: ${originalBlob.type}. Proceeding with explicit 'audio/wav'.`);
                                          }

                                          const audioUrl = URL.createObjectURL(audioBlob);
                                          const audio = new Audio(audioUrl);
                                          audio.play()
                                            .then(() => console.log(`[AudioPlayback] Playing ${filename}`))
                                            .catch(err => {
                                                console.error('[AudioPlayback] Error playing audio:', err);
                                                addAlert(`Error playing audio ${filename}: ${err.message}`);
                                            });
                                        } catch (error) {
                                          console.error('[AudioPlayback] Error fetching or playing audio:', error);
                                          addAlert(`Failed to play audio ${filename}: ${error.message}`);
                                        }
                                      }}
                                    >
                                      Play Audio
                                    </Button>
                                  </li>
                                )}
                              </ul>
                            ) : event.details}
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