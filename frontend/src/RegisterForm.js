import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import * as React from 'react';

export default function RegisterForm(params) {
  const [snackbar, setSnackbar] = React.useState(null);
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
      params.setOpen(false);
      params.setShowLoginForm(true);
      setSnackbar({children : 'Benutzer wurde erstellt', severity : 'success'});
    }).catch(() => {
      setSnackbar({children : 'Etwas ist schiefgelaufen', severity : 'error'});
    });
  };
  const handleOpenLogin = () => {
    params.setOpen(false);
    params.setShowLoginForm(true);
  };
  const handleCloseSnackbar = () => setSnackbar(null);

  return (<>
    <Dialog open={params.open}>
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
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
  </>);
}
