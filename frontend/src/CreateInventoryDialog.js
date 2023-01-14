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

export default function CreateInventoryDialog({open, setOpen, setActiveInventory}) {
  const handleClose           = () => { setOpen(false); };
  const handleCreateInventory = () => {
    const data = {
      name : document.getElementById("createInventory.name").value,
    };

    fetch(
      '/api/inventory',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)}
    ).then((response) => {
      setOpen(false);
    }).catch(() => {
      console.log('Could not create Inventory');
      setOpen(false);
    });
  };

  return (
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neue Inventur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="createInventory.name"
            label="Name"
            type="string"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleCreateInventory}>Erstellen</Button>
        </DialogActions>
      </Dialog>
  );
}
