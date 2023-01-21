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
  var [topBarContext, setTopBarContext] = React.useState(()=> null);

  var [userToken, setUserToken] = useStickyState(null, 'userToken');
  var [isLoggedIn, setIsLoggedIn] = useStickyState(false, 'isLoggedIn');
  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');


  React.useEffect(() => {
    console.log("Initial");
    document.title = 'Inventur';

    if (userToken != null) {
      const renew = async () => {
        try {
          const renewResponse = await fetch('/api/renew', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', token:userToken}
          });
          const renewJson = await renewResponse.json();
          if (renewJson.status === 400) {
            setUserToken(null);
            setSnackbar({ children: 'Session beendet', severity: 'error' });
            return;
          } else {
            setUserToken(renewJson.token);
            setSnackbar({ children: 'Neuer Token wurde erhalten', severity: 'warning' });
          }
        } catch(e) {
          console.log(e);
        }
      }; renew();
    }
  }, []);
  React.useEffect(()=>{
    const f = async() => {
      setIsLoggedIn(userToken != null);
    };
    f();
  }, [userToken, setUserToken]);

  const updateTitle = () => {
    if (activeInventory == null) {
      setTitle('Keine Inventur ausgewählt');
    } else if (activeCompany != null) {
      setTitle(activeInventory.name + ' (' + activeInventory.value + '€) - ' + activeCompany.name);
    } else {
      setTitle(activeInventory.name + ' (' + activeInventory.value + '€) - Firmenauswahl');
    }
  };
  React.useEffect(updateTitle, [activeInventory, activeCompany, setTitle]);

  var onArticleBackButtonClick = () => {
    setShowCompanies(true);
    setShowArticles(false);

    setActiveCompany(null);
  };
  const onLogout = () => setUserToken(null);
  const onFullPrices = () => setShowFullPrices(true);
  return (<>
    <TopBar
      title             = {title}
      setUserToken      = {setUserToken}
      onInventorySelect = {() => { setShowInventories(true); }} 
      onLogout          = {onLogout}
      onFullPrices      = {onFullPrices}
      renderContext     = {topBarContext}/>
    <div style={{marginBottom: '100px'}}/>
    <LoginScreen open    = {!isLoggedIn}
                 onLogin = {(token) => setUserToken(token)}
                 setSnackbar = {setSnackbar}/>
    <Inventories
      setSnackbar = {setSnackbar}
      userToken = {userToken}
      setUserToken = {setUserToken}
      open = {isLoggedIn && (showInventories || !activeInventory)}
      setOpen = {setShowInventories}
      activeInventory = {activeInventory}
      setActiveInventory = {setActiveInventory}
      onInventorySelected = {(inventory) => {
        setActiveInventory(inventory);
      }}
    />
    {/*
    <Companies
      open              = {isLoggedIn && !showFullPrices && showCompanies}
      activeCompany     = {activeCompany}
      userToken         = {userToken}
      setSnackbar       = {setSnackbar}
      activeInventory   = {activeInventory}
      onCompanySelected = {(company) => {
        setActiveCompany(company);
        setShowCompanies(false);
        setShowArticles(true);
      }}
      setTopBarContext  = {setTopBarContext}/>
    <Articles
      open            = {isLoggedIn && !showFullPrices && showArticles}
      userToken       = {userToken}
      activeCompany   = {activeCompany}
      activeInventory = {activeInventory}
      updateTitle     = {updateTitle}
      setSnackbar     = {setSnackbar}
      onBack          = {onArticleBackButtonClick}
      setTopBarContext  = {setTopBarContext}/>
    */}
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
  </>);
}
export default App;
