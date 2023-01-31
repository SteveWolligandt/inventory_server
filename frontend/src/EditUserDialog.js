import React from 'react';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import DialogActions from '@mui/material/DialogActions';

//import fetchWithToken from './jwtFetch.js';

export default function EditUserDialog({open, setOpen}) {
  var nameRef = React.useRef('');
  const noButtonRef = React.useRef(null);
  if (!open) {return null;}
  const handleDeleteNo = () => {
    setOpen(false);
  };

  const handleDeleteYes = async () => {
    //try {
    //  const url = '/api/company/' + deleteArguments.id;
    //  await fetchWithToken(url, {
    //    method: 'DELETE',
    //    headers: { 'Content-Type': 'application/json', token:userToken }
    //  }, userToken, setUserToken, setSnackbar);
    //
    //  setSnackbar({ children: 'Firma in Datenbank gelöscht', severity: 'success' });
    //  setDeleteArguments(null);
    //} catch (error) {
    //  setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
    //  setDeleteArguments(null);
    //}
  };
  return(
    <Dialog
      maxWidth="xs"
      TransitionProps={{ onEntered: ()=>{} }}
      open={open}
    >
      <DialogTitle>Benutzer ändern</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          id="editUser.name"
          label="Name"
          type="string"
          fullWidth
          variant="standard"
          inputRef={nameRef}
        />
        <FormControlLabel control={<Checkbox id="editUser.isAdmin" />} label="Admin" />
      </DialogContent>
      <DialogActions>
        <Button ref={noButtonRef} onClick={handleDeleteNo}>
          Abbrechen
        </Button>
        <Button onClick={handleDeleteYes}>
          Ändern
        </Button>
      </DialogActions>
    </Dialog>
  ) 
}

