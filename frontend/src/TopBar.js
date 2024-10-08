import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FunctionsIcon from '@mui/icons-material/Functions';
import ApartmentIcon from '@mui/icons-material/Apartment';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuIcon from '@mui/icons-material/Menu';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import ListItemIcon from '@mui/material/ListItemIcon';
import * as React from 'react';

const ITEM_HEIGHT = 48;

export default function TopBar({
  title,
  isAdmin,
  onInventorySelect,
  onPdfSelect,
  showAdminArea,
  setUserToken,
  renderContext,
  onFullValue,
  setLeftDrawerOpen,
  setShowBarcodeScanner
}) {

  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuOpen = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const renderAdminButton = () => {
    return (
      <MenuItem key='admin' onClick={()=>{showAdminArea();handleClose();}}>
        <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
        Admin Panel
      </MenuItem>
    );
  };
  return (
      <AppBar position="fixed">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0" />
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={()=>setLeftDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>


          <IconButton color="inherit" onClick={
            ()=>{
              console.log("scan");
              setShowBarcodeScanner(true);
            }}>
          <span className="material-symbols-outlined">
            barcode_scanner
          </span>
          </IconButton>
          <IconButton
              color="inherit"
              aria-label="more"
              id="long-button"
              aria-controls={menuOpen ? 'long-menu' : undefined}
              aria-expanded={menuOpen ? 'true' : undefined}
              aria-haspopup="true"
              onClick={handleClick}
            >
              <MoreVertIcon />
            </IconButton>

            <Menu
                id="long-menu"
                MenuListProps={{
                  'aria-labelledby': 'long-button',
                }}
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleClose}
                PaperProps={{
                  style: {
                    maxHeight: ITEM_HEIGHT * 4.5,
                    //width: '20ch',
                  },
                }}
              >
                {renderContext.map(({key, label, onClick, icon}) => (
                  <MenuItem key={key} onClick={()=>{onClick();handleClose();}}>
                    <ListItemIcon>{icon()}</ListItemIcon>
                    {label}
                  </MenuItem>
                ))}
                <MenuItem key='fullValue' onClick={()=>{onFullValue();handleClose();}}>
                  <ListItemIcon><FunctionsIcon/></ListItemIcon>
                  Gesamtwarenwert
                </MenuItem>
                <MenuItem key='chooseInventory' onClick={()=>{onInventorySelect();handleClose();}}>
                  <ListItemIcon><InventoryIcon/></ListItemIcon>
                  Inventur Auswählen
                </MenuItem>
                <MenuItem key='createPdf' onClick={()=>{onPdfSelect();handleClose();}}>
                  <ListItemIcon><PictureAsPdfIcon/></ListItemIcon>
                  Pdf erstellen
                </MenuItem>
                { isAdmin ? renderAdminButton() : null }
              </Menu>
        </Toolbar>
      </AppBar>
  );
}
