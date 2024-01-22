import * as React from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputAdornment from '@mui/material/InputAdornment';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import fetchWithToken from './jwtFetch.js'
import BarcodeScannerImpl from './BarcodeScannerImpl.jsx'
import Barcode from 'react-barcode';

export default function CreateProductDialog({
  open,
  setOpen,
  activeCompany,
  userToken,
  setUserToken,
  setSnackbar,
  activeInventory,
  defaultBarcode,
  onCreate,
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const name = React.useRef();
  const [nameValid, setNameValid] = React.useState(false);

  const productNumber = React.useRef();
  const [productNumberValid, setProductNumberValid] = React.useState(false);

  const purchasePrice = React.useRef();
  const [purchasePriceValid, setPurchasePriceValid] = React.useState(true);

  const percentage = React.useRef();
  const [percentageValid, setPercentageValid] = React.useState(true);

  const sellingPrice = React.useRef();
  const [sellingPriceValid, setSellingPriceValid] = React.useState(true);

  const amount = React.useRef();
  const [amountValid, setAmountValid] = React.useState(true);

  const [barcodeScannerOpen, setBarcodeScannerOpen] = React.useState(false);
  const [scannedBarcode, setScannedBarcode] = React.useState(defaultBarcode);

  React.useEffect(() => {
    if (open) {
      setBarcodeScannerOpen(false)
      setScannedBarcode(defaultBarcode)
    }
  }, [open]);

  if (!open) { return null }
  const handleClose     = () => { setOpen(false); };
  const handleCreate    = async () => {
    const data = {
      name : name.current.value,
      companyId : activeCompany.id,
      productNumber : productNumber.current.value,
    };
    if (scannedBarcode !== null) {
      data.barcode = scannedBarcode;
    }

    setIsLoading(true);
    try{
      const response = await fetchWithToken(
        '/api/product',{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token:userToken
        },
        body: JSON.stringify(data)}, userToken, setUserToken, setSnackbar
      )
      if (!response.ok) {
        setSnackbar({ children: 'Fehler beim Erstellen von ', severity: 'error' });
      }
      const product = await response.json();

      const inventoryData = {
        productId : product.id,
        inventoryId : activeInventory.id,
        purchasePrice : Number(purchasePrice.current.value),
        sellingPrice : Number(sellingPrice.current.value),
        percentage : Number(percentage.current.value),
        amount : Number(amount.current.value),
        notes: ''
      };
      const response2 = await fetchWithToken(
        '/api/inventorydata',{
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token:userToken
        },
        body: JSON.stringify(inventoryData)}, userToken, setUserToken, setSnackbar
      )
      if (onCreate !== null) { onCreate() }
    } catch(e) {
     console.log(e);
    }
    setIsLoading(false);
    setOpen(false);
  };

  const renderLoading = () => {
    if (!isLoading) { return null; }
    const style = {
      "float":"right",
    };
    return (<span style={style}><CircularProgress size="1rem"/></span>);
  };

  const updatePurchasePrice = () => {
    purchasePrice.current.value = sellingPrice.current.value * (1 - percentage.current.value/100);
  }
  const updateSellingPrice = () => {
    sellingPrice.current.value = purchasePrice.current.value / (1 - percentage.current.value/100);
  }
  const onPurchasePriceChange = () => {
    const purchasePriceEmpty = purchasePrice.current.value === '';
    setPurchasePriceValid(!purchasePriceEmpty);
    if (purchasePriceEmpty || !percentageValid){ return; }
    updateSellingPrice();
    setSellingPriceValid(!purchasePriceEmpty);
  };
  const onPercentageChange = () => {
    const empty = percentage.current.value === '';
    setPercentageValid(!empty);
    if (empty || !sellingPriceValid){ return; }
    updatePurchasePrice();
    setPurchasePriceValid(!empty);
  };
  const onSellingPriceChange = () => {
    const empty = sellingPrice.current.value === '';
    setSellingPriceValid(!empty);
    if (empty || !percentageValid){ return; }
    updatePurchasePrice();
    setPurchasePriceValid(!empty);
  };

  const renderBarcodeScanner = () => {
    if (barcodeScannerOpen) {
      return (<>
        <BarcodeScannerImpl 
          fps={10}
          qrbox={250}
          verbose={true}
          disableFlip={false}
          qrCodeSuccessCallback={
            barcode=>{
              setScannedBarcode(barcode)
              setBarcodeScannerOpen(false);
            }
          }/>
      </>);
    }
    return null;
  }

  const renderScannedBarcode = () => {
    if (scannedBarcode) {
      return (<>
        <Barcode value={scannedBarcode}/>
      </>);
    }
    return null;
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neuer Artikel in {activeCompany.name} {renderLoading()}</DialogTitle>
        <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          disabled={isLoading}
          label="Name"
          type="string"
          onChange={()=>setNameValid(name.current.value !== '')}
          fullWidth
          error={!nameValid}
          helperText={!nameValid?"Name darf nicht leer sein":""}
          variant="standard"
          inputRef={name}
        />
        <TextField
          margin="dense"
          disabled={isLoading}
          label="Artikelnummer"
          type="string"
          onChange={()=>setProductNumberValid(productNumber.current.value !== '')}
          fullWidth
          error={!productNumberValid}
          helperText={!productNumberValid?"Artikelnummer darf nicht leer sein":""}
          variant="standard"
          inputRef={productNumber}
        />
        <Box
          sx={{
              display:'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
          noValidate
          autoComplete="off"
        >   
        <TextField
          disabled={isLoading}
          label="EK"
          type="number"
          defaultValue={0}
          onChange={onPurchasePriceChange}
          error={!purchasePriceValid}
          helperText={!purchasePriceValid?"EK darf nicht leer sein":""}
          variant="standard"
          inputRef={purchasePrice}
          InputProps={{
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          }}
        />
        <TextField
          disabled={isLoading}
          type="number"
          label="Prozentsatz"
          onChange={onPercentageChange}
          defaultValue={0}
          error={!percentageValid}
          helperText={!percentageValid?"Prozent darf nicht leer sein":""}
          variant="standard"
          inputRef={percentage}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />
        <TextField
          disabled={isLoading}
          label="VK"
          type="number"
          defaultValue={0}
          onChange={onSellingPriceChange}
          error={!sellingPriceValid}
          helperText={!sellingPriceValid?"VK darf nicht leer sein":""}
          variant="standard"
          inputRef={sellingPrice}
          InputProps={{
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          }}
        />
        </Box>
        <TextField
          margin="dense"
          disabled={isLoading}
          label="Stückzahl"
          type="number"
          defaultValue={"0"}
          onChange={()=>setAmountValid(amount.current.value !== '')}
          fullWidth
          error={!amountValid}
          helperText={!amountValid?"Stückzahl darf nicht leer sein":""}
          variant="standard"
          inputRef={amount}
        />
        <Button onClick={()=>setBarcodeScannerOpen(!barcodeScannerOpen)}>Barcode umschalten</Button>
        {renderBarcodeScanner()}
        {renderScannedBarcode()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button 
            disabled={!nameValid ||
                      !productNumberValid ||
                      !purchasePriceValid ||
                      !percentageValid ||
                      !sellingPriceValid ||
                      !amountValid}
            onClick={handleCreate}>Erstellen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
