import CompaniesTable from './CompaniesTable.js';
import InventoryIcon from '@mui/icons-material/Inventory';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import TextField from '@mui/material/TextField';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InboxIcon from '@mui/icons-material/Inbox';
import MailIcon from '@mui/icons-material/Mail';
import ArticlesTable from './ArticlesTable.js';
import CreateArticleDialog from './CreateArticleDialog.js';
import TopBar from './TopBar.js';
import React, { useState, useEffect } from 'react';
import {Component} from 'react';
import Zoom from '@mui/material/Zoom';
import './App.css';

function App() {
  var [title, setTitle] = React.useState('Inventur');
  var [showCompanies, setShowCompanies] = React.useState(true);
  var [showCompanyDeleteRequest, setShowCompanyDeleteRequest] = React.useState(false);
  var [showArticles , setShowArticles ] = React.useState(false);
  var [activeInventory , setActiveInventory] = React.useState(null);
  var [activeCompany, setActiveCompany] = React.useState(null);
  var [drawLeftMenu, setDrawLeftMenu] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawLeftMenu(open);
  };

  const renderLeftDrawer = () => {
    return(
      <React.Fragment key={'left'}>
      <Drawer anchor  = {'left'}
              open    = {drawLeftMenu}
              onClose = {toggleDrawer(false)}
              variant = "temporary"
      >
      <Box sx={{width: 300}}>
      <TextField id="createInventory.name"
                 label="Outlined"
                 variant="outlined" />
      <Fab color="secondary"
           aria-label="add"
           style={{margin: 0,
                   top: 30, bottom: 'auto',
                   right: 'auto', left: 250,
                   position: 'fixed'}}
           onClick={() => {
               const data = { name : document.getElementById("createInventory.name").value };
               fetch('/api/inventory',{
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify(data)}
               ).then((response) => {
                 toggleDrawer(true)
               }).catch(() => {
                 console.log('Could not create Article');
                 toggleDrawer(true)
               });
               }
             }
      >
      <InventoryIcon />
      </Fab>
      </Box>
      </Drawer>
      </React.Fragment>
    );
  }
  return (
    <>
    <TopBar name={title} onClick={toggleDrawer(true)}/>
    <div style={{marginBottom: '100px'}}></div>

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
          setTitle(company.name);
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
                setTitle('Inventur');
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
