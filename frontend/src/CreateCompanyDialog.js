import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import fetchWithToken from './jwtFetch.js';

export default function CreateCompanyDialog({open, setOpen, userToken, setUserToken, setSnackbar}) {
  const handleCreate    = async () => {
    const name = document.getElementById("createCompany.name").value
    if (name === '') {
      setSnackbar(
          {children :'Name darf nicht leer sein', severity : 'error'});
      return;
    }

    await fetchWithToken(
      '/api/company',{
        method: 'POST',
        body: JSON.stringify({'name' : name}),
        headers: {
          'Content-Type': 'application/json',
          token         : userToken
        },
      }, userToken, setUserToken, setSnackbar)
    setOpen(false);
  };

  const style = {
    margin: 0,
    top: 80,
    bottom: 'auto',
    right: 20,
    left: 'auto',
    position: 'fixed',
  };
    return (
      <div>
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Neue Firma</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="createCompany.name"
              label="Name"
              type="string"
              fullWidth
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate}>Erstellen</Button>
          </DialogActions>
        </Dialog>
      </div>
    );
}
