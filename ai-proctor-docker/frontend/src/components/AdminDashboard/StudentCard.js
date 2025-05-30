import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

// Placeholder for student avatar if no image is available or for a more generic look
const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(7),
  height: theme.spacing(7),
  marginRight: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
}));

const StudentCard = ({ sessionData }) => {
  // Fallback to mock data if sessionData is not provided (for initial design/testing)
  const data = sessionData || {
    session_id: 'sess_mock_123',
    student_name: 'Mock Student',
    latest_status: 'Attentive', // Represents combined face and gaze status
    latest_audio_event: 'Normal', // Represents audio status
    last_snapshot_url: 'https://placehold.co/300x200.png?text=No+Snapshot',
    unread_alert_count: 0,
    last_alert_timestamp: new Date().toISOString(),
    monitoring_start_time: new Date(Date.now() - 3600 * 1000).toISOString()
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('no face') || lowerStatus.includes('multiple faces') || lowerStatus.includes('error')) return 'error';
    if (lowerStatus.includes('away') || lowerStatus.includes('suspicious')) return 'warning';
    if (lowerStatus.includes('attentive') || lowerStatus.includes('forward') || lowerStatus.includes('ok')) return 'success';
    return 'default';
  };

  const getAudioStatusColor = (audioStatus) => {
    if (!audioStatus) return 'default';
    const lowerAudio = audioStatus.toLowerCase();
    if (lowerAudio.includes('alert') || lowerAudio.includes('noise') || lowerAudio.includes('talking') || lowerAudio.includes('suspicious')) return 'error';
    if (lowerAudio.includes('normal') || lowerAudio.includes('quiet') || lowerAudio.includes('ok')) return 'success';
    return 'default';
  };

  // Determine overall card border based on alerts
  const cardBorderColor = data.unread_alert_count > 0 ? 'red' : '#ddd';
  const cardBorderStyle = data.unread_alert_count > 0 ? '2px solid' : '1px solid';

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', border: `${cardBorderStyle} ${cardBorderColor}` }}>
      <CardMedia
        component="img"
        height="140"
        image={data.last_snapshot_url || 'https://placehold.co/300x200.png?text=Snapshot+Unavailable'}
        alt={`Snapshot of ${data.student_name}`}
        sx={{ objectFit: 'cover' }} // Or 'contain' based on desired look
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <StyledAvatar>{data.student_name ? data.student_name.charAt(0).toUpperCase() : 'S'}</StyledAvatar>
          <Typography variant="h6" component="div" noWrap title={data.student_name}>
            {data.student_name || 'N/A'}
          </Typography>
        </Box>
        
        <Chip 
          label={`Face: ${data.latest_status || 'N/A'}`} 
          color={getStatusColor(data.latest_status)} 
          size="small" 
          sx={{ mb: 0.5, width: '100%', justifyContent: 'flex-start', paddingLeft: '8px' }}
          avatar={<Avatar sx={{ bgcolor: getStatusColor(data.latest_status) + '.dark', color: 'white', width: 18, height: 18, fontSize: '0.7rem' }}>F</Avatar>}
        />
        <Chip 
          label={`Audio: ${data.latest_audio_event || 'N/A'}`} 
          color={getAudioStatusColor(data.latest_audio_event)} 
          size="small" 
          sx={{ mb: 1, width: '100%', justifyContent: 'flex-start', paddingLeft: '8px' }}
          avatar={<Avatar sx={{ bgcolor: getAudioStatusColor(data.latest_audio_event) + '.dark', color: 'white', width: 18, height: 18, fontSize: '0.7rem' }}>A</Avatar>}
        />

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Session ID: <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{data.session_id?.substring(data.session_id.length - 8) || 'N/A'}</Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Alerts: {data.unread_alert_count > 0 ? 
            <Typography component="span" color="error" fontWeight="bold">{data.unread_alert_count}</Typography> : 
            '0'
          }
        </Typography>
        {data.last_alert_timestamp && data.unread_alert_count > 0 && (
          <Typography variant="caption" color="text.secondary" display="block">
            Last alert: {new Date(data.last_alert_timestamp).toLocaleTimeString()}
          </Typography>
        )}
         <Typography variant="caption" color="text.secondary" display="block">
            Monitoring since: {new Date(data.monitoring_start_time).toLocaleTimeString()}
          </Typography>
      </CardContent>
    </Card>
  );
};

export default StudentCard; 