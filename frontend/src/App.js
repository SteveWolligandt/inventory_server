import React, { useState, useEffect } from 'react';
import BasicTable from './BasicTable.js';
import CollapsibleTable from './CombinedTable.js';

import {Component} from 'react';
import './App.css';

const api = 'api';
const companiesEndPoint = '/companies';
function App() {
  var [isLoading, setIsLoading] = React.useState(true);
  var [companies, setCompanies] = React.useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(api + companiesEndPoint);
        const companiesJson = await response.json();
        var cs = [];
        console.log(companiesJson);
        for (var company in companiesJson) {
          if (companiesJson.hasOwnProperty(company)) {
            cs.push({id:companiesJson[company].id, name:companiesJson[company].name});
          }
        }
        setIsLoading(false);
        setCompanies(cs);
      } catch (error) {
          console.error(error);
      }
    }
    loadData();
  }, []);

  return BasicTable(companies);
}
export default App;
