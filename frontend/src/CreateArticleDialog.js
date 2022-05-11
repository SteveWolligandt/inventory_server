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

export default function CreateArticleDialog(params) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleClickOpen = () => { setDialogOpen(true); };
  const handleClose     = () => { setDialogOpen(false); };
  const handleCreate    = () => {
    const data = {
      name : document.getElementById("createArticle.name").value,
      companyId : params.company.id,
      purchasePrice : parseFloat(document.getElementById("createArticle.purchasePrice").value),
      percentage : parseFloat(document.getElementById("createArticle.percentage").value),
    };

    console.log('create new article: ' + JSON.stringify(data));

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
    top: 80,
    bottom: 'auto',
    right: 20,
    left: 'auto',
    position: 'fixed',
  };
  return (
    <div>
      <Dialog open={dialogOpen} onClose={handleClose}>
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
          <InputLabel htmlFor="createArticle.purchasePrice">Einkaufspreis</InputLabel>
          <Input
            id="createArticle.purchasePrice"
            startAdornment={<InputAdornment position="start"><EuroIcon /></InputAdornment>}
            onChange={()=>{
              var purchasePrice = document.getElementById("createArticle.purchasePrice").value;
              var percentage = document.getElementById("createArticle.percentage").value;
                document.getElementById("createArticle.sellingPrice").value = purchasePrice * (1 + percentage/100);
            }}
          />
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }} variant="standard">
          <InputLabel htmlFor="createArticle.percentage">Prozent</InputLabel>
          <Input
            id="createArticle.percentage"
            startAdornment={<InputAdornment position="start"><PercentIcon /></InputAdornment>}
            onChange={()=>{
              var purchasePrice = document.getElementById("createArticle.purchasePrice").value;
              var percentage = document.getElementById("createArticle.percentage").value;
                document.getElementById("createArticle.sellingPrice").value = purchasePrice * (1 + percentage/100);
            }}
          />
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }} variant="standard">
          <InputLabel htmlFor="createArticle.sellingPrice">Verkaufspreis</InputLabel>
          <Input
            id="createArticle.sellingPrice"
            startAdornment={<InputAdornment position="start"><EuroIcon /></InputAdornment>}
            onChange={()=>{
              var sellingPrice = document.getElementById("createArticle.sellingPrice").value;
              var percentage = document.getElementById("createArticle.percentage").value;
                document.getElementById("createArticle.purchasePrice").value = sellingPrice / (1 + percentage/100);
            }}
          />
        </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleCreate}>Erstellen</Button>
        </DialogActions>
      </Dialog>
      <Zoom in={params.open}>
        <Fab color="secondary" aria-label="add" style={style} onClick={handleClickOpen}>
          <ArticleIcon />
        </Fab>
      </Zoom>
    </div>
  );
}
