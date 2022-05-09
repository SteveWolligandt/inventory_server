import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';

export default function CreateCompanyDialog() {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => { setOpen(true); };
  const handleClose     = () => { setOpen(false); };
  const handleCreate    = () => {
    const data = {
      name : document.getElementById("createCompany.name").value
    };

    fetch(
      '/api/company',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)}
    ).then((response) => {
      setOpen(false);
    }).catch(() => {
      console.log('Could not create Company');
      setOpen(false);
    });
  };

  return (
    <div>
      <Grid container justifyContent="flex-end">
        <Button variant="contained" onClick={handleClickOpen}>
          Neue Firma
        </Button>
      </Grid>
      <Dialog open={open} onClose={handleClose}>
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
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleCreate}>Erstellen</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
