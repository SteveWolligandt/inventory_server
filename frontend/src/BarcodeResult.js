import React from 'react'
import BarcodeScannerImpl from './BarcodeScannerImpl.jsx';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import fetchWithToken from './jwtFetch.js';
import CircularProgress from '@mui/material/CircularProgress';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CompaniesList from './CompaniesList.js';
import ArticlesList from './ArticlesList.js';

export default function BarcodeResult(
    {open, setOpen, barcode, userToken, setUserToken, setSnackbar, activeInventory}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [article, setArticle] = React.useState(null);
  const [currentAmount, setCurrentAmount] = React.useState(0);
  const [showCompaniesList, setShowCompaniesList] = React.useState(false);
  const selectedCompany = React.useRef(null);
  const [showArticlesList, setShowArticlesList] = React.useState(false);
  const [showMessageAssignToArticle, setShowMessageAssignToArticle] = React.useState(false);
  const [showCountDialog, setShowCountDialog] = React.useState(false);
  React.useEffect(() => {
    const f = async () => {
      if (open) {
        if (barcode !== null) {
          setIsLoading(true);
          const url = '/api/article/from-barcode/' + barcode;
          const response = await fetchWithToken(url,
            { method: 'GET',
              headers: { 'Content-Type': 'application/json', token:userToken , inventoryId:activeInventory.id},
            }, userToken, setUserToken, setSnackbar
          )
          if (!response.ok) {
            console.log('error');
          }
          const json = await response.json();
          console.log(json)
          if (json.success) {
            setCurrentAmount(json.article.amount);
            setArticle(json.article);
            setShowCountDialog(true);
          } else {
            setShowMessageAssignToArticle(true);
          }
          setIsLoading(false);
        }
      } else {
        setShowCountDialog(false);
        setShowMessageAssignToArticle(false);
        setShowCompaniesList(false);
        setShowCompaniesList(false);
      }
    }; f();
  }, [open, barcode])

  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (<span style={{float:"right"}}><CircularProgress size="1rem"/></span>);
  };

  const sendAmount = async () => {
    setIsLoading(true);
    const url = '/api/amount/';
    const body = JSON.stringify({
      articleId : article.id,
      inventoryId : activeInventory.id,
      amount : currentAmount,
    });
    const response = await fetchWithToken(url, {
      method : 'PUT',
      headers : {'Content-Type' : 'application/json', token:userToken},
      body : body
    }, userToken, setUserToken, setSnackbar)
    setShowCountDialog(false);
    setOpen(false);
    setIsLoading(false);
  };
  if (!open) { return null; }
  return (<>
    <Dialog open={showCountDialog}>
      <DialogTitle>
      {article === null ? 'Laden' : article.name} {renderLoading()}
      </DialogTitle>
      <DialogContent>
      {article === null ? null : 'Firma: ' + article.companyName} <br/><br/>
      <IconButton onClick={()=>setCurrentAmount(Math.max(0,currentAmount-1))}>
        <RemoveCircleOutlineIcon/>
      </IconButton>  
      {currentAmount}
      <IconButton onClick={()=>setCurrentAmount(Math.max(currentAmount+1))}>
        <AddCircleOutlineIcon/>
      </IconButton>  
      </DialogContent>
      <DialogActions>
        <Button disabled={isLoading} onClick={()=>{
          setShowCountDialog(false);
          setOpen(false);
        }}>Abbrechen</Button>
        <Button disabled={isLoading} onClick={sendAmount}>Senden</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={showMessageAssignToArticle}>
      <DialogTitle>
        Barcode keinem Artikel zugewiesen
      </DialogTitle>
      <DialogContent>
        Soll der Barcode einem Artikel zugewiesen werden?
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setOpen(false)}>Abbrechen</Button>
        <Button onClick={()=>{
          setShowCompaniesList(true);
          setShowMessageAssignToArticle(false);
        }}>Zuweisen</Button>
      </DialogActions>
    </Dialog>

    <CompaniesList
      open              = {showCompaniesList}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      onCompanySelected = {(company) => {
        setShowCompaniesList(false);
        setShowArticlesList(true);
        selectedCompany.current=company;
      }}/>
    <ArticlesList
      open              = {showArticlesList}
      company           = {selectedCompany.current}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      onArticleSelected = {async (article) => {
        setShowArticlesList(false);
        const url = '/api/article/' + article.id + '/barcode';
        const response = await fetchWithToken(url,
          { method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              token:userToken,
              barcode:barcode
            },
          }, userToken, setUserToken, setSnackbar
        )
        if (!response.ok) {
          console.log('error');
        } else {
          setSnackbar({ children: 'Barcode hinzugefügt', severity: 'success' });
        }
        setOpen(false);
      }}/>
    </>)
}
