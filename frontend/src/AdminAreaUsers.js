import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import React from 'react';
import State from './AdminArea.js'

export default function AdminAreaUsers({setAdminState}) {
  return (
    <Box sx={{m:'3', justifyContent:"center", alignItems:"center"}}>
      <Button onClick={()=>setAdminState('Top')}>Back</Button>
    </Box>)
}
