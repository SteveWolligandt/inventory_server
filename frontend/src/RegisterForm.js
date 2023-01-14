import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import * as React from 'react';

export default function RegisterForm({open, setOpen, setShowLoginForm, setSnackbar}) {
  const handleRegister = () => { 
    if (document.getElementById("register.username").value === '') {
      setSnackbar(
          {children : 'Name darf nicht leer sein', severity : 'error'});
      return;
    }
    if (document.getElementById("register.password").value !==
        document.getElementById("register.passwordConfirmation").value) {
      setSnackbar(
          {children : 'Passwörter stimmen nicht überein', severity : 'error'});
      return;
    }
    if (document.getElementById("register.password").value === '') {
      setSnackbar(
          {children : 'Passwort darf nicht leer sein', severity : 'error'});
      return;
    }
    const data = {
      name:     document.getElementById("register.username").value,
      password: document.getElementById("register.password").value,
    };
    fetch(
      '/api/user',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)}
    ).then((response) => {
      setOpen(false);
      setShowLoginForm(true);
      setSnackbar({children : 'Benutzer wurde erstellt', severity : 'success'});
    }).catch(() => {
      setSnackbar({children : 'Etwas ist schiefgelaufen', severity : 'error'});
    });
  };
  const handleOpenLogin = () => {
    setOpen(false);
    setShowLoginForm(true);
  };
  const handleCloseSnackbar = () => setSnackbar(null);

  return (<>
    <Dialog open={open}>
      <DialogTitle>Neuer Benutzer</DialogTitle>
      <DialogContent>
        <TextField
          id="register.username"
          label="Benutzername"
        />
        <br/>
        <TextField
          id="register.password"
          label="Passwort"
          type="password"
        />
        <br/>
        <TextField
          id="register.passwordConfirmation"
          label="Passwort bestätigen"
          type="password"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleOpenLogin}>Zum Login</Button>
        <Button variant='contained' onClick={handleRegister}>Erstelle neuen Benutzer</Button>
      </DialogActions>
    </Dialog>
  </>);
}
