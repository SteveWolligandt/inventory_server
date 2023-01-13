import './App.css';

import React from 'react';
import useStickyState from './useStickyState.js';

import Articles from './ArticlesTable.js';
import Companies from './CompaniesTable.js';
import InventoriesList from './InventoriesList.js';
import LoginScreen from './LoginScreen.js';
import TopBar from './TopBar.js';


function App() {
  var [showLoginScreen, setShowLoginScreen] = React.useState(true)
  var [showCompanies, setShowCompanies] = useStickyState(true, 'showCompanies');
  var [showArticles, setShowArticles] = useStickyState(false, 'showArticles');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');

  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [inventories, setInventories] = React.useState([]);
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');
  var [drawInventoryListMenu, setDrawInventoryListMenu] = React.useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' &&
        (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawInventoryListMenu(open);
  };

  React.useEffect(() => {
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
  React.useEffect(() => {console.log(activeCompany)}, [activeCompany]);

  var onArticleBackButtonClick = () => {
    setShowCompanies(true);
    setShowArticles(false);
    setActiveCompany(null);
    setTitle('Firmen');
  };

  return (<>
    <TopBar name = {title} onClick =
         { toggleDrawer(true) } />
    <div style={{marginBottom: '100px'}}/>
    <LoginScreen open={showLoginScreen} setOpen={setShowLoginScreen} />
    <InventoriesList 
      inventories = {inventories}
      setActiveInventory = {setActiveInventory}
      setTitle = {setTitle}
      activeCompany = {activeCompany}
      setShowArticles = {setShowArticles}
      toggleDrawer = {toggleDrawer}
      drawInventoryListMenu = {drawInventoryListMenu}
      setDrawInventoryListMenu = {setDrawInventoryListMenu}
    />
    <Companies open = {!showLoginScreen && showCompanies}
               activeCompany = {activeCompany}
               onCompanySelected = {(company) => {
                 setActiveCompany(company);
                 setShowCompanies(false);
                 setShowArticles(true);
                 setTitle(
                   company.name + ' - ' + (activeInventory !== null
                     ? activeInventory.name
                     : '<Keine Inventur ausgewählt>'));
               }}/>
    <Articles open      = {!showLoginScreen && showArticles}
              company   = {activeCompany}
              inventory = {activeInventory}
              onBack    = {onArticleBackButtonClick} />
  </>);
}
export default App;
