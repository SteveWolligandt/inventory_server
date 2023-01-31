import List from '@mui/material/List';
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
export default function AdminArea({open}) {
  const [currentState, setCurrentState] =  React.useState(State.Top);
  if (!open) {
    return null;
  }
  if (currentState === State.Top) {
    return (
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
      </Box>)
  } else if (currentState === State.Users) {
    return (<><AdminAreaUsers setAdminState={setCurrentState}/></>)
  }
}
