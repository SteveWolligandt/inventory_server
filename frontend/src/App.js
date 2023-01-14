import './App.css';

import React from 'react';
import useStickyState from './useStickyState.js';

import Articles from './ArticlesTable.js';
import Companies from './CompaniesTable.js';
import Inventories from './InventoriesList.js';
import LoginScreen from './LoginScreen.js';
import FullPrice from './FullPrice.js';
import TopBar from './TopBar.js';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';


function App() {
  const [snackbar, setSnackbar] = React.useState(null);
  const handleCloseSnackbar = () => setSnackbar(null);
  var [showFullPrices, setShowFullPrices] = useStickyState(false, 'showFullPrices');
  var [showInventories, setShowInventories] = useStickyState(false, 'showInventories');
  var [showCompanies, setShowCompanies] = useStickyState(true, 'showCompanies');
  var [showArticles, setShowArticles] = useStickyState(false, 'showArticles');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');

  var [userToken, setUserToken] = useStickyState(null, 'userToken');
  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');


  React.useEffect(()=>{
    if (userToken == null) {
      return;
    }
    fetch('/api/tokenvalid', {
      method : "POST",
      headers : {"Content-Type" : "application/json"},
      body : JSON.stringify({token : userToken})
    })
    .then((response) => response.json())
    .then((response) => {if(!response.success) {setUserToken(null);}})
  }, [userToken, setUserToken]);

  const handleTitleBar = () => {
    if (activeInventory == null) {
      setTitle('Keine Inventur ausgewählt');
    } else if (activeCompany != null) {
      setTitle(activeInventory.name + ' - ' + activeCompany.name);
    } else {
      setTitle(activeInventory.name + ' - Firmenauswahl');
    }
  };
  React.useEffect(handleTitleBar, [activeInventory, activeCompany, setTitle]);

  var onArticleBackButtonClick = () => {
    setShowCompanies(true);
    setShowArticles(false);

    setActiveCompany(null);
  };
  const onLogout = ()=>setUserToken(null);
  const onFullPrices = ()=>setShowFullPrices(true);
  return (<>
    <TopBar setUserToken={setUserToken}
            name = {title}
            onInventorySelect = {() => { setShowInventories(true); }} 
            onLogout = {onLogout}
            onFullPrices = {onFullPrices}/>
    <div style={{marginBottom: '100px'}}/>
    <LoginScreen open    = {userToken == null}
                 onLogin = {(token) => setUserToken(token)}
                 setSnackbar = {setSnackbar}/>
    <Inventories
      setSnackbar = {setSnackbar}
      userToken = {userToken}
      open = {(userToken != null) && (showInventories || !activeInventory)}
      setOpen = {setShowInventories}
      activeInventory = {activeInventory}
      setActiveInventory = {setActiveInventory}
      onInventorySelected = {(inventory) => {
        setActiveInventory(inventory);
      }}
    />
    <Companies open              = {(userToken != null)&& !showFullPrices && showCompanies}
               activeCompany     = {activeCompany}
               userToken             = {userToken}
               setSnackbar = {setSnackbar}
               onCompanySelected = {(company) => {
                 setActiveCompany(company);
                 setShowCompanies(false);
                 setShowArticles(true);
               }}/>
    <Articles open            = {(userToken != null) && !showFullPrices && showArticles}
              userToken       = {userToken}
              activeCompany   = {activeCompany}
              activeInventory = {activeInventory}
              setSnackbar     = {setSnackbar}
              onBack          = {onArticleBackButtonClick} />
    <FullPrice open={(userToken != null) && showFullPrices}
               onBack = {()=>{setShowFullPrices(false);console.log('dsadsadsa');}}
               userToken={userToken}
               setSnackbar={setSnackbar}
               activeInventory = {activeInventory}/>
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
  </>);
}
export default App;
