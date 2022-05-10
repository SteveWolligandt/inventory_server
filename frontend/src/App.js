import CompaniesTable from './CompaniesTable.js';
import ArticlesTable from './ArticlesTable.js';
import TopBar from './TopBar.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import React, { useState, useEffect } from 'react';
import {Component} from 'react';
import './App.css';

function App() {
  var [showCompaniesTable, setShowCompaniesTable] = React.useState(true);
  var [showArticlesTable, setShowArticlesTable] = React.useState(false);
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
    <CompaniesTable open={showCompaniesTable} onOpenCompany={
      (id) => {
        console.log(id);
        setShowCompaniesTable(false);
        setShowArticlesTable(true);
        setActiveCompanyId(id)}}/>
    <ArticlesTable open={showArticlesTable} companyId={activeCompanyId}/>
    <div style={spaceStyle}></div>
    <CreateCompanyDialog />
    </div>
    </>
  );
}
export default App;
