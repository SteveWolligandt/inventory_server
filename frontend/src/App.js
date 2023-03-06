import './App.css';

import React from 'react';
import useStickyState from './useStickyState.js';

import ArticlesTable from './ArticlesTable.js';
import BarcodeScanner from './BarcodeScanner.js';
import BarcodeResult from './BarcodeResult.js';
import InventoryValueDialog from './InventoryValue.js';
import CompaniesTable from './CompaniesTable.js';
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
import fetchWithToken from "./jwtFetch.js";
import websocketAddr from './websocketAddress.js';
import useWebSocket, { ReadyState } from 'react-use-websocket';

const State = {
  Companies : 'companies',
  Articles : 'articles',
  AdminArea : 'adminarea',
};

async function createPdf(activeInventory, userToken, setUserToken, setSnackbar) {
  const url = '/api/pdf/' + activeInventory.id;
  const response = await fetchWithToken(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', token:userToken}
  }, userToken, setUserToken, setSnackbar);
  if (response.ok) {
    setSnackbar({ children: 'pdf erstellt', severity: 'success' });
  } else {
    setSnackbar({ children: 'da lief was schief', severity: 'error' });
  }
  const blob = await response.blob(); 
  const _url = window.URL.createObjectURL(blob);
  window.open(_url, '_blank');
}

export default function App() {
  const [snackbar, setSnackbar] = React.useState(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = React.useState(false);
  const handleCloseSnackbar = () => setSnackbar(null);
  const [currentState, setCurrentState] = useStickyState(State.Companies, 'currentState');
  var [showInventories, setShowInventories] = useStickyState(false, 'showInventories');
  var [showInventoryValue, setShowInventoryValue] = useStickyState(false, 'showInventoryValue');
  var [activeCompany, setActiveCompany] = useStickyState(null, 'activeCompany');
  var [topBarContext, setTopBarContext] = React.useState([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = React.useState(false);
  const [showBarcodeResult, setShowBarcodeResult] = React.useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = React.useState(null);

  var [userToken, setUserToken] = useStickyState(null, 'userToken');
  var [isAdmin, setIsAdmin] = useStickyState(null, 'isAdmin');
  var [isLoggedIn, setIsLoggedIn] = useStickyState(false, 'isLoggedIn');
  var [title, setTitle] = useStickyState('Firmen', 'title');
  var [activeInventory, setActiveInventory] =
      useStickyState(null, 'activeInventory');
  const { sendMessage, lastMessage, readyState } = useWebSocket(websocketAddr());

  React.useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({token:userToken}))
    }
  }, [readyState, userToken, sendMessage])

  //React.useEffect(() => {
  //  document.title = 'Inventur';
  //
  //  if (userToken != null) {
  //    const renew = async () => {
  //      try {
  //        const renewResponse = await fetch('/api/renew', {
  //          method: 'GET',
  //          headers: { 'Content-Type': 'application/json', token:userToken}
  //        });
  //        const renewJson = await renewResponse.json();
  //        if (renewJson.status === 400) {
  //          setUserToken(null);
  //          setSnackbar({ children: 'Session beendet', severity: 'warning' });
  //          return;
  //          setUserToken(renewJson.token);
  //        }
  //      } catch(e) {
  //        console.error(e);
  //        setSnackbar({ children: e.message, severity: 'error' });
  //      }
  //    }; renew();
  //  }
  //}, []);
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

  const onBarcodeScanned = (barcode) => {
    setShowBarcodeScanner(false);
    setShowBarcodeResult(true);
    setLastScannedBarcode(barcode);
  }

  const onFullValue   = () => setShowInventoryValue(true);
  const showAdminArea = () => setCurrentState(State.AdminArea);
  const showCompanies = () => setCurrentState(State.Companies);
  const showArticles  = () => setCurrentState(State.Articles);
  const onArticleBackButtonClick = () => {
    showCompanies();
    setActiveCompany(null);
  };
  const onLogout     = () => {setUserToken(null); showCompanies();}
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
      onPdfSelect       = {() => { createPdf(activeInventory, userToken, setUserToken, setSnackbar); }} 
      isAdmin           = {isAdmin}
      showAdminArea     = {showAdminArea}
      onFullValue       = {onFullValue}
      renderContext     = {topBarContext}
      setLeftDrawerOpen = {setLeftDrawerOpen}
      setShowBarcodeScanner = {setShowBarcodeScanner}
    />
    <div style={{marginBottom: '90px'}}/>
    <BarcodeScanner
      open             = {showBarcodeScanner}
      setOpen          = {setShowBarcodeScanner}
      onBarcodeScanned = {onBarcodeScanned}/>
    <BarcodeResult
      open         = {showBarcodeResult}
      setOpen      = {setShowBarcodeResult}
      barcode      = {lastScannedBarcode}
      userToken    = {userToken}
      setUserToken = {setUserToken}
      activeInventory = {activeInventory}
      setSnackbar  = {setSnackbar}/>
    <LoginScreen
      open        = {!isLoggedIn}
      onLogin     = {onLogin}
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
    <CompaniesTable
      open              = {isLoggedIn &&  currentState === State.Companies}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      activeInventory   = {activeInventory}
      onCompanySelected = {(company) => {
        setActiveCompany(company);
        showArticles();
      }}
      setTopBarContext  = {setTopBarContext}
      lastMessage = {lastMessage}
    />
    <ArticlesTable
      open             = {isLoggedIn && currentState === State.Articles}
      userToken        = {userToken}
      setUserToken     = {setUserToken}
      activeCompany    = {activeCompany}
      activeInventory  = {activeInventory}
      updateTitle      = {updateTitle}
      setSnackbar      = {setSnackbar}
      onBack           = {onArticleBackButtonClick}
      lastMessage      = {lastMessage}
      setTopBarContext = {setTopBarContext}/>
    <AdminArea
      open = {isLoggedIn && currentState === State.AdminArea} 
      userToken={userToken}
      setUserToken={setUserToken}
      setSnackbar={setSnackbar}
      setTopBarContext={setTopBarContext}
      showCompanies={showCompanies}
    />
    <LeftDrawer open={leftDrawerOpen} setOpen={setLeftDrawerOpen} onLogout={onLogout}/>
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
    </ThemeProvider>
    </>
  );
}
