import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Zoom from '@mui/material/Zoom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import PercentIcon from '@mui/icons-material/Percent';
import ArticleIcon from '@mui/icons-material/Article';
import EuroIcon from '@mui/icons-material/Euro';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import fetchWithToken from './jwtFetch.js';

export default function CreateArticleDialog({open, setOpen, activeCompany, userToken, setUserToken, setSnackbar, setArticles, activeInventory}) {

  const handleClickOpen = () => { setOpen(true); };
  const handleClose     = () => { setOpen(false); };
  const handleCreate    = async () => {
    const name = document.getElementById("createArticle.name").value;
    const articleNumber = document.getElementById("createArticle.articleNumber").value;
    if (name === '') {
      setSnackbar(
          {children :'Name darf nicht leer sein', severity : 'error'});
      return;
    }
    if (articleNumber === '') {
      setSnackbar(
          {children :'Artikelnummber darf nicht leer sein', severity : 'error'});
      return;
    }
    const data = {
      name : name,
      companyId : activeCompany.id,
      articleNumber : articleNumber,
    };

    await fetchWithToken(
      '/api/article',{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token:userToken
      },
      body: JSON.stringify(data)}, userToken, setUserToken, setSnackbar
    )
    setOpen(false);
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
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neuer Artikel</DialogTitle>
        <DialogContent>
        <FormControl fullWidth sx={{ m: 1 }} variant="standard">
          <InputLabel htmlFor="createArticle.name">Name</InputLabel>
          <Input
            id="createArticle.name"
            startAdornment={<InputAdornment position="start"><ArticleIcon /></InputAdornment>}
          />
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }} variant="standard">
          <InputLabel htmlFor="createArticle.articleNumber">Artikel Nummer</InputLabel>
          <Input
            id="createArticle.articleNumber"
            startAdornment={<InputAdornment position="start"><ArticleIcon /></InputAdornment>}
          />
        </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleCreate}>Erstellen</Button>
        </DialogActions>
      </Dialog>
      <Zoom in={open}>
        <Fab color="secondary" aria-label="add" style={style} onClick={handleClickOpen}>
          <ArticleIcon />
        </Fab>
      </Zoom>
    </div>
  );
}
