import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
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
  var [activeCompany, setActiveCompany] = React.useState(null);

















  const [drawLeftMenu, setDrawLeftMenu] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }

    setDrawLeftMenu(open);
  };

  return (
    <>
    <TopBar name={title} onClick={toggleDrawer(true)}/>
    <div style={{marginBottom: '100px'}}></div>

    {/* left menu*/}
    <div>
      <React.Fragment key={'left'}>
        <Drawer
          anchor={'left'}
          open={drawLeftMenu}
          onClose={toggleDrawer(false)}
        >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer( false)}
          onKeyDown={toggleDrawer(false)}
        >
        dsdsa
        </Box>
            </Drawer>
          </React.Fragment>
        </div>
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
    <ArticlesTable open={showArticles} company={activeCompany}/>
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
