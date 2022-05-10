import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import BusinessIcon from '@mui/icons-material/Business';

export default function CreateCompanyDialog(params) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleClickOpen = () => { setDialogOpen(true); };
  const handleClose     = () => { setDialogOpen(false); };
  const handleCreate    = () => {
    const data = {
      name : document.getElementById("createCompany.name").value,
    };

    fetch(
      '/api/company',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)}
    ).then((response) => {
      setDialogOpen(false);
    }).catch(() => {
      console.log('Could not create Company');
      setDialogOpen(false);
    });
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
        <Dialog open={dialogOpen} onClose={handleClose}>
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
        <Zoom in={params.open}>
          <Fab color="secondary" aria-label="add" style={style} onClick={handleClickOpen}>
            <BusinessIcon />
          </Fab>
        </Zoom>
      </div>
    );
}
