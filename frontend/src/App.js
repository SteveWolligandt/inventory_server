import CompaniesTable from './CompaniesTable.js';
import ArticlesTable from './ArticlesTable.js';
import TopBar from './TopBar.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import React, { useState, useEffect } from 'react';
import {Component} from 'react';
import './App.css';

function App() {
  var [showCompaniesTable, setShowCompaniesTable] = React.useState(false);
  var [showArticlesTable, setShowArticlesTable] = React.useState(true);
  var [activeCompanyId, setActiveCompanyId] = React.useState(44);
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
