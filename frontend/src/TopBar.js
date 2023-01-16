import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function TopBar({title, onInventorySelect, setUserToken, onFullPrices, onLogout, renderContext}) {
  return (
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          {renderContext != null ? renderContext() : null}
          <Button
            color="inherit"
            onClick={onInventorySelect}>
            Inventur Auswählen
          </Button>

          <Button color="inherit" onClick={onFullPrices}>
            Gesamt
          </Button>

          <Button color="inherit" onClick={onLogout}>
            Logout
          </Button>


        </Toolbar>
      </AppBar>
  );
}
