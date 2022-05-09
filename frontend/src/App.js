import CompaniesTable from './CompaniesTable.js';
import TopBar from './TopBar.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import React, { useState, useEffect } from 'react';
import {Component} from 'react';
import './App.css';

function App() {
  var [showCompaniesTable, setShowCompaniesTable] = React.useState(true);
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
    <div style={outerStyle}>
    <CompaniesTable open={showCompaniesTable}/>
    <div style={spaceStyle}></div>
    <CreateCompanyDialog />
    </div>
    </>
  );
}
export default App;
