import React from 'react';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import fetchWithToken from './jwtFetch.js';

export default function EditUserDialog({open, setOpen, user, userToken, setUserToken, setSnackbar}) {
  var pw1 = React.useRef();
  var pw2 = React.useRef();
  const username = React.useRef();
  const isAdmin = React.useRef();
  const [userNameValid, setUserNameValid] = React.useState(true);
  const [passwordsValid, setPasswordsValid] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  if (!open) {return null;}
  const handleCancel = () => {
    setOpen(false);
  };

  const handlePWChange = (event) => {
    setPasswordsValid(pw1.current.value === pw2.current.value);
  }
  const handleChange = async () => {
    try {
      const url = '/api/user';
      var headers = {
          'Content-Type':'application/json',
          token:userToken,
          user:user.current.name,
      }

      if (username.current.value !== '' &&
          username.current.value !== user.current.name) {
         headers['newUser'] = username.current.value
      }
      if (pw1.current.value !== '' &&
          pw1.current.value === pw2.current.value) {
         headers['password'] = pw1.current.value
      }
      if (user.current.isAdmin !== isAdmin.current.checked) {
         headers['isAdmin'] = isAdmin.current.checked
      }
      console.log(headers);
      setIsLoading(true);
      const response = await fetchWithToken(url, {
        method: 'PUT',
        headers: headers
      }, userToken, setUserToken, setSnackbar);

      setIsLoading(false);
      if (response.ok) {
        setSnackbar({ children: 'Benutzer erfolgreich geändert', severity: 'success' });
        setOpen(false);
      } else {
        setSnackbar({ children: 'Benutzer ändern fehlgeschlagen: ' + response.status, severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ children: "Unerwarteter Fehler: " + error, severity: 'error' });
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
      <DialogTitle>Benutzer ändern {renderLoading()}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          disabled={isLoading}
          label="Name"
          type="string"
          fullWidth
          defaultValue={user.current.name}
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
          control={<Checkbox
                      inputRef={isAdmin}
                      defaultChecked={user.current.isAdmin}
                      disabled={isLoading}
                      margin="dense" />}
          label="Admin"/>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleChange} disabled={!userNameValid || !passwordsValid}>
          Ändern
        </Button>
      </DialogActions>
    </Dialog>
  ) 
}

