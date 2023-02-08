import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import React from 'react';
import PersonIcon from '@mui/icons-material/Person';
import AdminAreaUsers from './AdminAreaUsers.js';

export const State = {
  Top : 'Top',
  Users : 'Users',
};
export default function AdminArea({open, userToken, setUserToken, setSnackbar, setTopBarContext}) {
  const [currentState, setCurrentState] =  React.useState(State.Top);
  if (!open) {
    return null;
  }
  if (currentState === State.Top) {
    setTopBarContext(null);
    return (
    <Paper  elevation="5" sx={{ overflow: 'hidden', 'margin-left':'50px' , 'margin-right':'50px', height:'calc(100vh - 110px)' }}>
      <Box sx={{m:'3', justifyContent:"center", alignItems:"center"}}>
        <List>
          <ListItem>
            <ListItemButton onClick={()=>setCurrentState(State.Users)}>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Paper>)
  } else if (currentState === State.Users) {
    return (
      <AdminAreaUsers
        adminState={currentState}
        setAdminState={setCurrentState}
        userToken={userToken}
        setUserToken={setUserToken}
        setSnackbar={setSnackbar}
        setTopBarContext={setTopBarContext}
      />)

  }
}
