import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import React from 'react';
import PersonIcon from '@mui/icons-material/Person';
import ApartmentIcon from '@mui/icons-material/Apartment';
import {State} from './AdminArea.js';

export default function AdminAreaTopMenu({
  adminState,
  setAdminState,
  userToken,
  setUserToken,
  setSnackbar,
  setTopBarContext,
  showCompanies
}) {
  if (adminState !== State.Top) { return null; }
  //setTopBarContext([]);
  return (
  <Paper
    elevation="5"
    sx={{overflow:'hidden',
         'marginLeft':'20px',
         'marginRight':'20px',
         height:'calc(100vh - 110px)'
       }}>
    <Box sx={{m:'3', justifyContent:"center", alignItems:"center"}}>
      <List>
        <ListItem>
          <ListItemButton onClick={()=>setAdminState(State.Users)}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Benutzer" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={showCompanies}>
            <ListItemIcon>
              <ApartmentIcon/>
            </ListItemIcon>
            <ListItemText primary="Firmen" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  </Paper>)
} 
