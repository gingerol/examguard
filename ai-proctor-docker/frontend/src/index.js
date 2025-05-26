import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import 'bootstrap/dist/css/bootstrap.min.css'; // Commenting out Bootstrap CSS
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// A default theme can be created for now, or customized later
const theme = createTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Optional: for baseline styling normalization */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
); 