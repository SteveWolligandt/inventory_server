import './App.css';

import React from 'react';
import useStickyState from './useStickyState.js';

import Articles from './ArticlesTable.js';
import InventoryValueDialog from './InventoryValue.js';
import Companies from './CompaniesTable.js';
import AdminArea from './AdminArea.js';
import Inventories from './InventoriesList.js';
import LoginScreen from './LoginScreen.js';
import LeftDrawer from './LeftDrawer.js';
import TopBar from './TopBar.js';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import { Theme } from "./Theme";

const State = {
  Companies : 'companies',
  Articles : 'articles',
  AdminArea : 'adminarea',
};
function App() {
  const [snackbar, setSnackbar] = React.useState(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = React.useState(false);
  const handleCloseSnackbar = () => setSnackbar(null);
  const [currentState, setCurrentState] = useStickyState('companies', 'currentState');
  var [showInventories, setShowInventories] = useStickyState(false, 'showInventories');
  var [showInventoryValue, setShowInventoryValue] = useStickyState(false, 'showInventoryValue');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');
  var [topBarContext, setTopBarContext] = React.useState([]);

  var [userToken, setUserToken] = useStickyState(null, 'userToken');
  var [isAdmin, setIsAdmin] = useStickyState(null, 'isAdmin');
  var [isLoggedIn, setIsLoggedIn] = useStickyState(false, 'isLoggedIn');
  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');


  React.useEffect(() => {
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
            setSnackbar({ children: 'Session beendet', severity: 'warning' });
            return;
          } else {
            setUserToken(renewJson.token);
          }
        } catch(e) {
          console.error(e);
          setSnackbar({ children: e.message, severity: 'error' });
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
      setTitle(activeInventory.name + ' - ' + activeCompany.name);
    } else {
      setTitle(activeInventory.name + ' - Firmenauswahl');
    }
  };
  React.useEffect(updateTitle, [activeInventory, activeCompany, setTitle]);

  var onArticleBackButtonClick = () => {
    setCurrentState(State.Companies);
    setActiveCompany(null);
  };
  const onLogout     = () => {setUserToken(null); setCurrentState(State.companies);}
  const onFullValue  = () => setShowInventoryValue(true);
  const onTopBarAdminClick = () => {setCurrentState(State.AdminArea);}
  const onTopBarCompaniesClick = () => {setCurrentState(State.Companies);}
  const onLogin = (token, isAd) => {
    setUserToken(token);
    setIsAdmin(isAd);
  }

  return (
    <>
    <GlobalStyles styles={{body: { backgroundColor: "#E8EBF0" }}}/>
    <ThemeProvider theme={Theme}>
    <TopBar
      title             = {title}
      setUserToken      = {setUserToken}
      onInventorySelect = {() => { setShowInventories(true); }} 
      isAdmin           = {isAdmin}
      onAdminClick      = {onTopBarAdminClick}
      onCompaniesClick  = {onTopBarCompaniesClick}
      onFullValue       = {onFullValue}
      renderContext     = {topBarContext}
      setLeftDrawerOpen = {setLeftDrawerOpen}/>
    <div style={{marginBottom: '90px'}}/>
    <LoginScreen open    = {!isLoggedIn}
                 onLogin = {onLogin}
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
    <InventoryValueDialog
      open              = {isLoggedIn && (showInventoryValue)}
      setOpen           = {setShowInventoryValue}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      activeInventory   = {activeInventory}/>
    <Companies
      open              = {isLoggedIn &&  currentState===State.Companies}
      activeCompany     = {activeCompany}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      activeInventory   = {activeInventory}
      onCompanySelected = {(company) => {
        setActiveCompany(company);
        setCurrentState(State.Articles);
      }}
      setTopBarContext  = {setTopBarContext}/>
    <Articles
      open            = {isLoggedIn && currentState===State.Articles}
      userToken       = {userToken}
      setUserToken    = {setUserToken}
      activeCompany   = {activeCompany}
      activeInventory = {activeInventory}
      updateTitle     = {updateTitle}
      setSnackbar     = {setSnackbar}
      onBack          = {onArticleBackButtonClick}
      setTopBarContext  = {setTopBarContext}/>
    <AdminArea
      open = {isLoggedIn && currentState === State.AdminArea} 
      userToken={userToken}
      setUserToken={setUserToken}
      setSnackbar={setSnackbar}
      setTopBarContext={setTopBarContext}
    />
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
    <LeftDrawer open={leftDrawerOpen} setOpen={setLeftDrawerOpen} onLogout={onLogout}/>
    </ThemeProvider>
    </>
  );
}
export default App;
