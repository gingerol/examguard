import React from 'react';
import { useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

const StudentSessionDetail = () => {
  const { sessionId } = useParams();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Student Session Detail
        </Typography>
        <Typography variant="h6">
          Session ID: {sessionId}
        </Typography>
        <Typography sx={{ mt: 2 }}>
          More details for this session will be displayed here (e.g., photo snapshots, detailed logs, etc.).
        </Typography>
      </Paper>
    </Container>
  );
};

export default StudentSessionDetail; 