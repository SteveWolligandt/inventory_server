import CompaniesTable from './CompaniesTable.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';

import {Component} from 'react';
import './App.css';

function App() {
  const outerStyle = {
    margin: '0 auto',
    maxWidth: '700px',
  };
  const spaceStyle = {
    marginBottom: '30px',
  };
  return (
    <div style={outerStyle}>
    <CompaniesTable />
    <div style={spaceStyle}></div>
    <CreateCompanyDialog />
    </div>
  );
}
export default App;
