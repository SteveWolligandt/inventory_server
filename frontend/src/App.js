import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import ArticlesTable from './ArticlesTable.js';
import CreateArticleDialog from './CreateArticleDialog.js';
import TopBar from './TopBar.js';
import React, { useState, useEffect } from 'react';
import {Component} from 'react';
import './App.css';

function App() {
  var [showCompanies, setShowCompanies] = React.useState(true);
  var [showArticles, setShowArticles] = React.useState(false);
  var [activeCompanyId, setActiveCompanyId] = React.useState(0);
  const outerStyle = {
    margin: '0 auto',
    maxWidth: '700px',
  };
  const spaceStyle = {
    marginBottom: '30px',
  };

  return (
    <>
    <TopBar name='Firmen'/>
    <div style={{marginBottom: '100px'}}></div>
    <div style={outerStyle}>
    <CompaniesTable open={showCompanies} onOpenCompany={
      (id) => {
        console.log(id);
        setShowCompanies(false);
        setShowArticles(true);
        setActiveCompanyId(id)}}/>
    <ArticlesTable open={showArticles} companyId={activeCompanyId}/>
    <div style={spaceStyle}></div>
    <CreateCompanyDialog open={showCompanies}/>
    <CreateArticleDialog open={showArticles} companyId={activeCompanyId}/>
    </div>
    </>
  );
}
export default App;
