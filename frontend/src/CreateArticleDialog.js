import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';

export default function CreateArticleDialog(params) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => { setOpen(true); };
  const handleClose     = () => { setOpen(false); };
  const handleCreate    = () => {
    const data = {
      name : document.getElementById("createArticle.name").value,
      companyId : params.companyId,
    };

    fetch(
      '/api/article',{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)}
    ).then((response) => {
      setOpen(false);
    }).catch(() => {
      console.log('Could not create Article');
      setOpen(false);
    });
  };

  const style = {
    margin: 0,
    top: 'auto',
    right: 20,
    bottom: 20,
    left: 'auto',
    position: 'fixed',
  };
  if (params.open) {
    return (
      <div>
        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Neuer Artikel</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="createArticle.name"
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
        <Fab color="primary" aria-label="add" style={style} onClick={handleClickOpen}>
          <AddIcon />
        </Fab>
      </div>
    );
  } else {
    return (<></>);
  }
}
