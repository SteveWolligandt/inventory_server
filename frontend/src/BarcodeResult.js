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

export default function BarcodeResult(
    {open, setOpen, barcode, userToken, setUserToken, setSnackbar, activeInventory}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [article, setArticle] = React.useState(null);
  const [currentAmount, setCurrentAmount] = React.useState(0);
  React.useEffect(() => {
    const f = async () => {
      if (open && barcode !== null) {
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
        setCurrentAmount(json.amount);
        setArticle(json);
        setIsLoading(false);
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
    setOpen(false);
    setIsLoading(false);
  };
  return (
    <Dialog open={open} onClose={()=>{}}>
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
      <Button disabled={isLoading} onClick={()=>setOpen(false)}>Abbrechen</Button>
      <Button disabled={isLoading} onClick={sendAmount}>Senden</Button>
      </DialogActions>
    </Dialog>)
}
