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
import ProductsList from './ProductsList.js';
import CreateProductDialog from './CreateProductDialog.js';

export default function BarcodeResult(
    {open, setOpen, barcode, userToken, setUserToken, setSnackbar, activeInventory}) {
  const [isLoading,                  setIsLoading]                  = React.useState(false);
  const [product,                    setProduct]                    = React.useState(null);
  const [currentAmount,              setCurrentAmount]              = React.useState(0);
  const [showCreateProduct,          setShowCreateProduct]          = React.useState(false);
  const [showCompaniesList,          setShowCompaniesList]          = React.useState(false);
  const [showProductsList,           setShowProductsList]           = React.useState(false);
  const [showMessageAssignToProduct, setShowMessageAssignToProduct] = React.useState(false);
  const [showCountDialog,            setShowCountDialog]            = React.useState(false);
  const selectedCompany                                             = React.useRef(null);
  const stateAfterCompanyPicker                                     = React.useRef(null);
  React.useEffect(() => {
    const f = async () => {
      if (open) {
        if (barcode !== null) {
          console.log(barcode)
          setIsLoading(true);
          const url = '/api/product/from-barcode/' + barcode;
          console.log("waiting for response")
          const response = await fetchWithToken(url,
            { method: 'GET',
              headers: { 'Content-Type': 'application/json', token:userToken , inventoryId:activeInventory.id},
            }, userToken, setUserToken, setSnackbar
          )
          setIsLoading(false);
          console.log('got response');
          if (response.ok) {
            const json = await response.json();
            console.log(json)
            if (json.success) {
              setCurrentAmount(json.product.amount);
              setProduct(json.product);
              setShowCountDialog(true);
            } else {
              setShowMessageAssignToProduct(true);
            }
          } else {
            console.log('error');
          }
        }
      } else {
        //setShowCountDialog(false);
        //setShowMessageAssignToProduct(false);
        //setShowCompaniesList(false);
        //setShowCompaniesList(false);
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
      productId : product.id,
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
        {product === null ? 'Laden' : product.name} {renderLoading()}
      </DialogTitle>

      <DialogContent>
        {product === null ? null : 'Firma: ' + product.companyName} <br/><br/>
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

    <Dialog open={showMessageAssignToProduct}>
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
          setShowMessageAssignToProduct(false);
          stateAfterCompanyPicker.current = 'create';
        }}>Neuer Artikel</Button>
        <Button onClick={()=>{
          setShowCompaniesList(true);
          setShowMessageAssignToProduct(false);
          stateAfterCompanyPicker.current = 'assign';
        }}>Zuweisen</Button>
      </DialogActions>
    </Dialog>

    <CreateProductDialog
      open={showCreateProduct}
      setOpen={setShowCreateProduct}
      userToken={userToken}
      setUserToken={setUserToken}
      activeCompany={selectedCompany.current}
      setSnackbar={setSnackbar}
      activeInventory={activeInventory}
      defaultBarcode={barcode}
      onCreate={()=>{
        setShowCreateProduct(false);
        setOpen(false);
      }}/>

    <CompaniesList
      open              = {showCompaniesList}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      onCompanySelected = { (company) => {
        selectedCompany.current = company;
        setShowCompaniesList(false);
        if (stateAfterCompanyPicker.current === 'assign') {
          setShowProductsList(true);
        } else if (stateAfterCompanyPicker.current === 'create') {
          setShowCreateProduct(true);
        }
      }}/>

    <ProductsList
      open              = {showProductsList}
      company           = {selectedCompany.current}
      userToken         = {userToken}
      setUserToken      = {setUserToken}
      setSnackbar       = {setSnackbar}
      onProductSelected = {async (product) => {
        setShowProductsList(false);
        const url = '/api/product/' + product.id + '/barcode';
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
