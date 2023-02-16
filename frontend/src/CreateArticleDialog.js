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


export default function CreateArticleDialog({open, setOpen, activeCompany, userToken, setUserToken, setSnackbar, setArticles, activeInventory}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const name = React.useRef();
  const [nameValid, setNameValid] = React.useState(false);

  const articleNumber = React.useRef();
  const [articleNumberValid, setArticleNumberValid] = React.useState(false);

  const purchasePrice = React.useRef();
  const [purchasePriceValid, setPurchasePriceValid] = React.useState(true);

  const percentage = React.useRef();
  const [percentageValid, setPercentageValid] = React.useState(true);

  const sellingPrice = React.useRef();
  const [sellingPriceValid, setSellingPriceValid] = React.useState(true);

  const amount = React.useRef();
  const [amountValid, setAmountValid] = React.useState(true);

  const handleClose     = () => { setOpen(false); };
  const handleCreate    = async () => {
    const data = {
      name : name.current.value,
      companyId : activeCompany.id,
      articleNumber : articleNumber.current.value,
    };

    setIsLoading(true);
    try{
      const response = await fetchWithToken(
        '/api/article',{
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
      const article = await response.json();

      const inventoryData = {
        articleId : article.id,
        inventoryId : activeInventory.id,
        purchasePrice : Number(purchasePrice.current.value),
        sellingPrice : Number(sellingPrice.current.value),
        percentage : Number(percentage.current.value),
        amount : Number(amount.current.value),
        notes: ''
      };
      console.log(inventoryData);
      const response2 = await fetchWithToken(
        '/api/inventorydata',{
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          token:userToken
        },
        body: JSON.stringify(inventoryData)}, userToken, setUserToken, setSnackbar
      )
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

  return (
    <>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neuer Artikel {renderLoading()}</DialogTitle>
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
          onChange={()=>setArticleNumberValid(articleNumber.current.value !== '')}
          fullWidth
          error={!articleNumberValid}
          helperText={!articleNumberValid?"Artikelnummer darf nicht leer sein":""}
          variant="standard"
          inputRef={articleNumber}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button 
            disabled={!nameValid ||
                      !articleNumberValid ||
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
