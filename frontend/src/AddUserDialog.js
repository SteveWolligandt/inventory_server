import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import DialogActions from '@mui/material/DialogActions';

import fetchWithToken from './jwtFetch.js';

export default function AddUserDialog({open, setOpen, userToken, setUserToken, setSnackbar}) {
  const noButtonRef = React.useRef(null);
  var pw1 = React.useRef();
  var pw2 = React.useRef();
  const username = React.useRef();
  const isAdmin = React.useRef();
  const [userNameValid, setUserNameValid] = React.useState(false);
  const [passwordsValid, setPasswordsValid] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  if (!open) {return null;}
  const handleCancel = () => {
    setOpen(false);
  };

  const handlePWChange = (event) => {
    if (pw1.current.value === pw2.current.value) {
      setPasswordsValid(pw1.current.value !== '');
    } else {
      setPasswordsValid(false);
    }
  }
  const handleChange = async () => {
    try {
      const url = '/api/user';
      const basicAuth = "Basic " + btoa(username.current.value + ':' + pw1.current.value);
      setIsLoading(true);
      const response = await fetchWithToken(url, {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          token:userToken,
          Authorization:basicAuth,
          isAdmin:isAdmin.current.checked
}
      }, userToken, setUserToken, setSnackbar);

      setIsLoading(false);
      if (response.ok) {
        setSnackbar({ children: 'Benutzer erfolgreich erstellt', severity: 'success' });
        setOpen(false);
      } else {
        setSnackbar({ children: 'Benutzer erstellen fehlgeschlagen', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ children: "Da lief was schief: " + error, severity: 'error' });
    }
  };
  const renderLoading = () => {
    if (!isLoading) { return null; }
    const style = {
      "float":"right",
    };
    return (<span style={style}><CircularProgress size="1rem"/></span>);
  };
  return(
    <Dialog
      maxWidth="xs"
      TransitionProps={{ onEntered: ()=>{} }}
      open={open}
    >
      <DialogTitle>Neuer Benutzer {renderLoading()}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          disabled={isLoading}
          label="Name"
          type="string"
          fullWidth
          onChange={()=>setUserNameValid(username.current.value !== '')}
          error={!userNameValid}
          helperText={!userNameValid?"Name darf nicht leer sein":""}
          variant="standard"
          inputRef={username}
        />
        <TextField
          variant="standard"
          margin="dense"
          fullWidth
          disabled={isLoading}
          label="Passwort"
          type="password"
          error={!passwordsValid}
          onChange={handlePWChange}
          inputRef={pw1}
        />
        <TextField
          variant="standard"
          margin="dense"
          fullWidth
          disabled={isLoading}
          label="Passwort bestätigen"
          type="password"
          error={!passwordsValid}
          helperText={!passwordsValid?"Passwörter stimmen nicht überein":""}
          onChange={handlePWChange}
          inputRef={pw2}
        />
        <FormControlLabel
          control={<Checkbox inputRef={isAdmin}
          disabled={isLoading}
            margin="dense" />}
          label="Admin"/>
      </DialogContent>
      <DialogActions>
        <Button ref={noButtonRef} onClick={handleCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleChange} disabled={!userNameValid || !passwordsValid}>
          Ändern
        </Button>
      </DialogActions>
    </Dialog>
  ) 
}

