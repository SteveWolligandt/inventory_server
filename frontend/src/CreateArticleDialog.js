import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Zoom from '@mui/material/Zoom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import ArticleIcon from '@mui/icons-material/Article';

export default function CreateArticleDialog(params) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleClickOpen = () => { setDialogOpen(true); };
  const handleClose     = () => { setDialogOpen(false); };
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
      setDialogOpen(false);
    }).catch(() => {
      console.log('Could not create Article');
      setDialogOpen(false);
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
  return (
    <div>
      <Dialog open={dialogOpen} onClose={handleClose}>
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
      <Zoom in={params.open}>
        <Fab color="primary" aria-label="add" style={style} onClick={handleClickOpen}>
          <ArticleIcon />
        </Fab>
      </Zoom>
    </div>
  );
}
