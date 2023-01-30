import * as React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import BusinessIcon from '@mui/icons-material/Business';
import fetchWithToken from './jwtFetch';

export default function InventoryValueDialog({open, setOpen, userToken, setUserToken, setSnackbar, activeInventory}) {
  var [isLoading, setIsLoading] = React.useState(false);
  var [value, setValue] = React.useState(0);
  const handleClose           = () => { setOpen(false); };

  const loadValue = () => {
    if (userToken == null) {return;}
    if (activeInventory == null) {return;}
    const loadData = async() => {
      setIsLoading(true);
      try {
        const response = await fetchWithToken('/api/inventory/'+activeInventory.id+'/value', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        }, userToken, setUserToken, setSnackbar)
        if (response == null) {return;}
        const companiesJson = await response.json();
        console.log(companiesJson);
        setValue(companiesJson.value);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    loadData();
  };
  React.useEffect(loadValue, [open, userToken, activeInventory]);
  if (!open) { return null; }
  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
      <CircularProgress /></div>);
  };
  const renderValue = () => {
    return (value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€');
  };
  return (
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Gesamtwarenwert</DialogTitle>
        <DialogContent>
          {renderLoading()}
          {renderValue()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Schließen</Button>
        </DialogActions>
      </Dialog>
  );
}
