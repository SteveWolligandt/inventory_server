import React , { useState, useEffect } from 'react';
import './App.css';

import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import ArticlesTable from './ArticlesTable.js';
import CreateArticleDialog from './CreateArticleDialog.js';
import TopBar from './TopBar.js';
import InventoriesList from './InventoriesList.js';

// MUI Widgets
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import TextField from '@mui/material/TextField';
import Zoom from '@mui/material/Zoom';

// MUI Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
  var [inventories, setInventories] = React.useState([]);
  var [activeInventory , setActiveInventory] = useStickyState(null, 'activeInventory');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');
  var [drawInventoryListMenu, setDrawInventoryListMenu] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawInventoryListMenu(open);
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
    <InventoriesList 
      inventories = {inventories}
      setActiveInventory = {setActiveInventory}
      setTitle = {setTitle}
      activeCompany = {activeCompany}
      setActiveCompany = {setActiveCompany}
      setShowArticles = {setShowArticles}
      setCreateInventoryDialogOpen = {setCreateInventoryDialogOpen}
      toggleDrawer = {toggleDrawer}
      drawInventoryListMenu = {drawInventoryListMenu}
      setDrawInventoryListMenu = {setDrawInventoryListMenu}
    />

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
