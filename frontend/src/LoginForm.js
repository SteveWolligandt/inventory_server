import * as React from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

export default function LoginForm({open, setOpen, onLogin, setShowRegisterForm}) {
  const [snackbar, setSnackbar] = React.useState(null);
  const handleLogin = () => {
    if (document.getElementById("login.username").value === '') {
      setSnackbar(
          {children : 'Name darf nicht leer sein', severity : 'error'});
      return;
    }
    if (document.getElementById("login.password").value === '') {
      setSnackbar(
          {children : 'Passwort darf nicht leer sein', severity : 'error'});
      return;
    }
    const data = {
      username:     document.getElementById("login.username").value,
      password: document.getElementById("login.password").value,
    };
    fetch(
      '/api/login',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)})
    .then((response)  => response.json())
    .then((data) => {
      if (data.success) {
        setSnackbar({children : 'Erfolgreich angemeldet', severity : 'success'});
        onLogin(data.token);
      } else {
        setSnackbar({children : 'Fehler bei der Anmeldung', severity : 'error'});
      }
    }).catch(() => {
      setSnackbar({children : 'Etwas ist schiefgelaufen', severity : 'error'});
    });
  };
  const handleOpenRegister = () => {
    setOpen(false);
    setShowRegisterForm(true);
  };
  const handleCloseSnackbar = () => setSnackbar(null);

  return (<>
    <Dialog open={open}>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <TextField
          id="login.username"
          label="Benutzername"
        />
        <br/>
        <TextField
          id="login.password"
          label="Passwort"
          type="password"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleOpenRegister}>Zur Nutzererstellung</Button>
        <Button variant='contained' onClick={handleLogin}>Login</Button>
      </DialogActions>
    </Dialog>
    {!!snackbar && (
      <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
        <Alert {...snackbar} onClose={handleCloseSnackbar} />
      </Snackbar>
    )}
  </>);
}
