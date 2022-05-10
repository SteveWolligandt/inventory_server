import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import Fab from '@mui/material/Fab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  var [showArticles , setShowArticles ] = React.useState(false);
  var [activeCompany, setActiveCompany] = React.useState(null);

  return (
    <>
    <TopBar name={title}/>
    <div style={{marginBottom: '100px'}}></div>
    <div style={{
      margin: '0 auto',
      maxWidth: '700px',
    }}>
    <CompaniesTable open={showCompanies} onOpenCompany={
      (company) => {
        console.log(company);
        setShowCompanies(false);
        setShowArticles(true);
        setActiveCompany(company);
        setTitle(company.name);
      }}/>
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
