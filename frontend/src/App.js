import React , { useState, useEffect } from 'react';
import './App.css';

import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import ArticlesTable from './ArticlesTable.js';
import CreateArticleDialog from './CreateArticleDialog.js';
import TopBar from './TopBar.js';

// MUI Widgets
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Drawer from '@mui/material/Drawer';
import Zoom from '@mui/material/Zoom';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';

// MUI Icons
import InboxIcon from '@mui/icons-material/Inbox';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarBorder from '@mui/icons-material/StarBorder';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

function useStickyState(defaultValue, key) {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null
      ? JSON.parse(stickyValue)
      : defaultValue;
  });
  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

function App() {
  var [createInventoryDialogOpen, setCreateInventoryDialogOpen] = React.useState(false);
  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [showCompanies, setShowCompanies] = useStickyState(true, 'showCompanies');
  var [showArticles , setShowArticles] = useStickyState(false, 'showArticles');
  var [showCompanyDeleteRequest, setShowCompanyDeleteRequest] = React.useState(false);
  var [inventories , setInventories] = React.useState([]);
  var [activeInventory , setActiveInventory] = useStickyState(null, 'activeInventory');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');
  var [drawLeftMenu, setDrawLeftMenu] = React.useState(false);
  const [leftPaneInventoryOpen, setLeftPaneInventoryOpen] = React.useState(true);

  const handleLeftPaneInventoryClick = () => {
    setLeftPaneInventoryOpen(!leftPaneInventoryOpen);
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawLeftMenu(open);
  };
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/inventories');
        const inventoriesJson = await response.json();
        var is = [];
        for (var companyJson in inventoriesJson) {
          if (inventoriesJson.hasOwnProperty(companyJson)) {
            is.push(inventoriesJson[companyJson]);
          }
        }
        setInventories(is);
      } catch (error) {
        console.error(error);
      }
    }
    loadData();
  }, []);

  const renderLeftDrawer = () => {
    return(
      <React.Fragment key={'left'}>
      <Drawer anchor  = {'left'}
              open    = {drawLeftMenu}
              onClose = {toggleDrawer(false)}
              variant = "temporary"
      >
      <Box sx={{width: 300}}>
      <List
      sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
      component="nav"
      aria-labelledby="nested-list-subheader"
      subheader={
        <ListSubheader component="div" id="nested-list-subheader">
          Nested List Items
        </ListSubheader>
      }
    >
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
            <ListItemButton sx={{ pl: 4 }}
                            onClick={() => {
                              setActiveInventory(inventory);
                              setDrawLeftMenu(false);
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
    <Zoom in={drawLeftMenu}
          style={{ transitionDelay: drawLeftMenu ? '300ms' : '0ms' }}>
    <Fab color="secondary"
         size='medium'
         aria-label="add"
         style={{margin: 0,
                 top: 'auto', bottom: 30,
                 right: 'auto', left: 273,
                 position: 'fixed'}}
         onClick={() => {toggleDrawer(true); setCreateInventoryDialogOpen(true)}}
    >
    <InventoryIcon />
    </Fab>
    </Zoom>
    </Box>
    </Drawer>
    </React.Fragment>
    );
  }
  const handleCreateInventoryDialogClose = () => setCreateInventoryDialogOpen(false);
  const handleCreateInventoryDialogCreate = () => {
     const data = { name : document.getElementById("createInventory.name").value };
     fetch('/api/inventory',
           { method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(data)}).
     then((response) => response.json()).
     then((responseJson) => setActiveInventory(responseJson));
     setCreateInventoryDialogOpen(false)
  }
  return (
    <>
    <TopBar name={title} onClick={toggleDrawer(true)}/>
    <div style={{marginBottom: '100px'}}></div>

    <Dialog open={createInventoryDialogOpen} onClose={handleCreateInventoryDialogClose}>
      <DialogTitle>Neue Inventur</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="createInventory.name"
          label="Name"
          type="string"
          fullWidth
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCreateInventoryDialogClose}>Abbrechen</Button>
        <Button onClick={handleCreateInventoryDialogCreate}>Erstellen</Button>
      </DialogActions>
    </Dialog>
    {/* left menu*/}
    {renderLeftDrawer()}
    {/* end of left menu*/}

    <div style={{
      margin: '0 auto',
      maxWidth: '1000px',
    }}>
    <CompaniesTable
      open={showCompanies}
      showDeleteRequest={setShowCompanyDeleteRequest}
      onOpenCompany={
        (company) => {
          setShowCompanies(false);
          setShowArticles(true);
          setActiveCompany(company);
          setTitle(company.name + ' - ' +(activeInventory !== null ? activeInventory.name : '<Keine Inventur ausgewählt>'));
        }}
      onDeleteCompany={
      (company) => {
        setShowCompanyDeleteRequest(true)
      }}
    />
    <ArticlesTable open={showArticles} company={activeCompany} inventory={activeInventory}/>
    <CreateCompanyDialog open={showCompanies}/>
    <CreateArticleDialog open={showArticles} company={activeCompany}/>
      <div>
        <Zoom in={showArticles}>
          <Fab color='secondary' aria-label="add" style={{
                margin: '0 auto',
                top: 80,
                right: 'auto',
                bottom: 'auto',
                left: 10,
                position: 'fixed',
              }} onClick={()=>{
                setShowCompanies(true);
                setShowArticles(false);
                setActiveCompany(null);
                setTitle('Firmen');
              }}>
            <ArrowBackIcon/>
          </Fab>
        </Zoom>
      </div>
    </div>
    </>
  );
}
export default App;
