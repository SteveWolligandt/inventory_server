import './App.css';

import React from 'react';
import useStickyState from './useStickyState.js';

import Articles from './ArticlesTable.js';
import Companies from './CompaniesTable.js';
import Inventories from './InventoriesList.js';
import LoginScreen from './LoginScreen.js';
import TopBar from './TopBar.js';


function App() {
  var [showLoginScreen, setShowLoginScreen] = React.useState(true)
  var [showInventories, setShowInventories] = useStickyState(true, 'showInventories');
  var [showCompanies, setShowCompanies] = useStickyState(true, 'showCompanies');
  var [showArticles, setShowArticles] = useStickyState(false, 'showArticles');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');

  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [inventories, setInventories] = React.useState([]);
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');


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
    setShowInventories(false);
    setShowCompanies(true);
    setShowArticles(false);

    setActiveCompany(null);
    setTitle('Firmen');
  };

  return (<>
    <TopBar name = {title} onClick =
    {() => { setShowInventories(true);setShowCompanies(false);setShowArticles(false); }} />
    <div style={{marginBottom: '100px'}}/>
    <LoginScreen open={showLoginScreen} setOpen={setShowLoginScreen} />
    <Inventories
      open = {!showLoginScreen && showInventories}
               activeInventory = {activeInventory}
               onInventorySelected = {(inventory) => {
                 setActiveInventory(inventory);
                 setShowInventories(false);
                 setShowCompanies(true);
                 setShowArticles(false);
                 setTitle(
                   activeInventory !== null
                     ? activeInventory.name
                     : '<Keine Inventur ausgewählt>');
               }}
    />
    <Companies open = {!showLoginScreen && showCompanies}
               activeCompany = {activeCompany}
               onCompanySelected = {(company) => {
                 setActiveCompany(company);
                 setShowInventories(false);
                 setShowCompanies(false);
                 setShowArticles(true);
                 setTitle(
                   company.name + ' - ' + (activeInventory !== null
                     ? activeInventory.name
                     : '<Keine Inventur ausgewählt>'));
               }}/>
    <Articles open      = {!showLoginScreen && showArticles}
              activeCompany   = {activeCompany}
              activeInventory = {activeInventory}
              onBack    = {onArticleBackButtonClick} />
  </>);
}
export default App;
