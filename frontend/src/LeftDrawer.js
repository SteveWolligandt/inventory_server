import * as React from 'react';
import Box from '@mui/material/Box';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import LogoutIcon from '@mui/icons-material/Logout';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

export default function LeftDrawer({open, setOpen, onLogout}) {
  const list = () => (
    <Box
      sx={{ width:250 }}
      role="presentation"
      onClick={setOpen(false)}
      onKeyDown={setOpen(false)}
    >
    </Box>
  );

  const toggleDrawer = (open) => (event) => {
    if (event &&
        event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setOpen(open);
  };

  return (
    <>
    <React.Fragment>
      <SwipeableDrawer
        open={open}
        anchor='left'
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
      >
    <Box
      sx={500}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}>
      <List>
        <ListItem key="logout" disablePadding>
            <ListItemButton onClick={()=>{setOpen(false);onLogout();}}>
              <ListItemIcon>
                <LogoutIcon /> 
              </ListItemIcon>
              <ListItemText primary="Abmelden" />
            </ListItemButton>
          </ListItem>
      </List>
    </Box>
      </SwipeableDrawer>
    </React.Fragment>
    </>
  );
}
