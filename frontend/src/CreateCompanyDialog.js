import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function CreateCompanyDialog() {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = document.getElementById("name").value;
    await fetch( '/api/company/'
      ,{
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
    //  mode: 'no-cors', // no-cors, *cors, same-origin
    //  headers: { 'Content-Type':'application/json' },
    //  body: JSON.stringify({
    //    name : name
    //  }),
    }
    );
    console.log(name);
    setOpen(false);
  };

  return (
    <div>
      <Button variant="Contained" onClick={handleClickOpen}>
        Neue Firma
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neue Firma</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            type="string"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={async() => await handleCreate()}>Erstellen</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
