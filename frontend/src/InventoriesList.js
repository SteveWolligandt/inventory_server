import React , { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import InboxIcon from '@mui/icons-material/Inbox';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import StarBorder from '@mui/icons-material/StarBorder';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';

export default function InventoriesList(params) {
  var inventories = params.inventories;
  var setActiveInventory = params.setActiveInventory;
  var setTitle = params.setTitle;
  var activeCompany = params.activeCompany;
  var setActiveCompany = params.setActiveCompany;
  var setShowArticles = params.setShowArticles;
  var setCreateInventoryDialogOpen = params.setCreateInventoryDialogOpen;
  var toggleDrawer = params.toggleDrawer;
  var drawInventoryListMenu = params.drawInventoryListMenu;
  var setDrawInventoryListMenu = params.setDrawInventoryListMenu;

  const [leftPaneInventoryOpen, setLeftPaneInventoryOpen] = React.useState(true);
  const handleLeftPaneInventoryClick = () => {
    setLeftPaneInventoryOpen(!leftPaneInventoryOpen);
  };
  return(
    <React.Fragment key={'left'}>
    <Drawer anchor  = {'left'}
            open    = {drawInventoryListMenu}
            onClose = {toggleDrawer(false)}
            variant = "temporary">
    <Box sx={{width: 300}}>
    <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
          component="nav"
          aria-labelledby="nested-list-subheader"
          subheader={
            <ListSubheader component="div" id="nested-list-subheader">
              Nested List Items
            </ListSubheader>
          }>
    <ListItemButton component="a" href="/pdf">
      <ListItemIcon>
        <PictureAsPdfIcon />
      </ListItemIcon>
      <ListItemText primary="PDF" />
    </ListItemButton>
    <ListItemButton onClick={handleLeftPaneInventoryClick}>
      <ListItemIcon>
        <InventoryIcon />
      </ListItemIcon>
      <ListItemText primary="Inventuren" />
      {leftPaneInventoryOpen ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton>
    <Collapse in={leftPaneInventoryOpen} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {inventories.map((inventory) => (
          <ListItemButton key     = {inventory.id}
                          sx      = {{ pl: 4 }}
                          onClick = {() => {
                            setActiveInventory(inventory);
                            setDrawInventoryListMenu(false);
                            if (setShowArticles) {
                              setTitle(activeCompany.name +' - '+ inventory.name);
                            }
                          }}>
            <ListItemIcon>
              <Inventory2OutlinedIcon />
            </ListItemIcon>
            <ListItemText primary={inventory.name} />
          </ListItemButton>
        ))}       
      </List>
    </Collapse>
    </List>
    <Zoom in={drawInventoryListMenu}
          style={{ transitionDelay: drawInventoryListMenu ? '300ms' : '0ms' }}>
    <Fab color="secondary"
         size='medium'
         aria-label="add"
         style={{margin: 0,
                 top: 'auto', bottom: 30,
                 right: 'auto', left: 273,
                 position: 'fixed'}}
         onClick={() => {toggleDrawer(true); setCreateInventoryDialogOpen(true)}}>
    <InventoryIcon />
    </Fab>
    </Zoom>
    </Box>
    </Drawer>
    </React.Fragment>
  );
}
