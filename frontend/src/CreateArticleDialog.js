import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import fetchWithToken from './jwtFetch.js'


export default function CreateArticleDialog({open, setOpen, activeCompany, userToken, setUserToken, setSnackbar, setArticles, activeInventory}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const name = React.useRef();
  const [nameValid, setNameValid] = React.useState(false);

  const articleNumber = React.useRef();
  const [articleNumberValid, setArticleNumberValid] = React.useState(false);

  const handleClose     = () => { setOpen(false); };
  const handleCreate    = async () => {
    const data = {
      name : name.current.value,
      companyId : activeCompany.id,
      articleNumber : articleNumber.current.value,
    };

    setIsLoading(true);
    const response = await fetchWithToken(
      '/api/article',{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token:userToken
      },
      body: JSON.stringify(data)}, userToken, setUserToken, setSnackbar
    )
    if (!response.ok) {
      setSnackbar({ children: 'Fehler beim Erstellen von ', severity: 'error' });
    }
    setIsLoading(false);
    setOpen(false);
  };

  const renderLoading = () => {
    if (!isLoading) { return null; }
    const style = {
      "float":"right",
    };
    return (<span style={style}><CircularProgress size="1rem"/></span>);
  };
  return (
    <>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Neuer Artikel {renderLoading()}</DialogTitle>
        <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          disabled={isLoading}
          label="Name"
          type="string"
          onChange={()=>setNameValid(name.current.value !== '')}
          fullWidth
          error={!nameValid}
          helperText={!nameValid?"Name darf nicht leer sein":""}
          variant="standard"
          inputRef={name}
        />
        <TextField
          margin="dense"
          disabled={isLoading}
          label="Artikelnummer"
          type="string"
          onChange={()=>setArticleNumberValid(articleNumber.current.value !== '')}
          fullWidth
          error={!articleNumberValid}
          helperText={!articleNumberValid?"Artikelnummer darf nicht leer sein":""}
          variant="standard"
          inputRef={articleNumber}
        />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button 
            disabled={!nameValid || !articleNumberValid}
            onClick={handleCreate}>Erstellen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
