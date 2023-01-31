import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function TopBar({
  title,
  isAdmin,
  onInventorySelect,
  onAdminClick,
  setUserToken,
  onLogout,
  renderContext,
  onFullValue
}) {

  const renderAdminButton = () => {
    return (
      <IconButton color="inherit" onClick={onAdminClick}>
        <AdminPanelSettingsIcon />
      </IconButton>);
  };
  return (
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>

          { renderContext != null ? renderContext() : null }
          { isAdmin ? renderAdminButton() : null }
          <Button
            color="inherit"
            onClick={onInventorySelect}>
            Inventur Auswählen
          </Button>

          <Button color="inherit" onClick={onFullValue}>
            Gesamtwarenwert
          </Button>

          <Button color="inherit" onClick={onLogout}>
            Logout
          </Button>


        </Toolbar>
      </AppBar>
  );
}
