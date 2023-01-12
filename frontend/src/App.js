import './App.css';

import React, {useEffect, useState} from 'react';

import Articles from './ArticlesTable.js';
import Companies from './CompaniesTable.js';
import InventoriesList from './InventoriesList.js';
import LoginScreen from './LoginScreen.js';
import TopBar from './TopBar.js';

function useStickyState(defaultValue, key) {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  React.useEffect(
      () => { window.localStorage.setItem(key, JSON.stringify(value)); },
      [ key, value ]);
  return [ value, setValue ];
}

function App() {
  var [showLoginScreen, setShowLoginScreen] = React.useState(true)
  var [showCompanies, setShowCompanies] = useStickyState(true, 'showCompanies');
  var [showArticles, setShowArticles] = useStickyState(false, 'showArticles');

  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [inventories, setInventories] = React.useState([]);
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');
  var [drawInventoryListMenu, setDrawInventoryListMenu] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')) {
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

  var onOpenCompany = (company) => {
    setShowCompanies(false);
    setShowArticles(true);
    setActiveCompany(company);
    setTitle(company.name + ' - ' +
             (activeInventory !== null ? activeInventory.name
                                       : '<Keine Inventur ausgewählt>'));
  };

  var onOpenArticle = () => {
    setShowCompanies(true);
    setShowArticles(false);
    setActiveCompany(null);
    setTitle('Firmen');
  };

  return (<>
    <TopBar name = {title} onClick =
         { toggleDrawer(true) } />
    <div style={{marginBottom: '100px'}}/>
    <LoginScreen open={showLoginScreen} />
    <InventoriesList 
      inventories = {inventories}
      setActiveInventory = {setActiveInventory}
      setTitle = {setTitle}
      activeCompany = {activeCompany}
      setActiveCompany = {setActiveCompany}
      setShowArticles = {setShowArticles}
      toggleDrawer = {toggleDrawer}
      drawInventoryListMenu = {drawInventoryListMenu}
      setDrawInventoryListMenu = {setDrawInventoryListMenu}
    />
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} />
    <Companies open = {showCompanies}
               onOpen = {onOpenCompany}/>
    <Articles open      = {showArticles}
              company   = {activeCompany}
              inventory = {activeInventory}
              onOpen    = {onOpenArticle} />
  </>);
}
export default App;
