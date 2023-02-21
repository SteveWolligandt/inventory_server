import AddCircleIcon from '@mui/icons-material/AddCircle';
import {blue} from '@mui/material/colors';
import List from '@mui/material/List';
import CircularProgress from '@mui/material/CircularProgress';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DialogTitle from '@mui/material/DialogTitle';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import React from 'react';

import fetchWithToken from './jwtFetch.js';

export default function ArticlesList({
  open,
  onArticleSelected,
  userToken,
  setUserToken,
  company,
  setSnackbar,
}) {
  const [allArticles, setAllArticles] = React.useState([]);
  const [filteredArticles, setFilteredArticles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const searched = React.useRef("");
  
  const loadArticles = () => {
    if (!open)             { setAllArticles([]);setFilteredArticles([]); return; }
    if (userToken == null) {return;}
    const loadData = async() => {
      setIsLoading(true);
      try {
        const response = await fetchWithToken(
          '/api/company/' + company.id + '/articles', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        }, userToken, setUserToken, setSnackbar)
        if (!response.ok) {
          console.log('nich ok');
          return;}
        const articles = await response.json();
        console.log(articles);
        articles.sort((article1, article2) => {
          const name1 = article1.name.toUpperCase();
          const name2 = article2.name.toUpperCase();
          return (name1 < name2) ? -1 : (name1 > name2) ? 1 : 0;
        });
        setAllArticles(articles);
        setFilteredArticles(articles);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    loadData();
  };
  React.useEffect(loadArticles, [open, userToken]);

  if (!open) {return null;}

  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
      <CircularProgress /></div>);
  };
  const requestSearch = (event) => {
    const filteredItems = allArticles.filter((article) => {
      console.log(article);
      //return true
      return article.name.toUpperCase().includes(searched.current.value.toUpperCase());
    });
    setFilteredArticles(filteredItems);
  };

  return (
    <>
    <Dialog open={open}>
      <DialogTitle>Artikel auswählen</DialogTitle>
      {renderLoading()}
      <TextField
        type="search"
        inputRef={searched}
        onChange={(searchVal) => requestSearch(searchVal)}
        placeholder="Suchen"
      />
      <List sx={{ pt: 0 }}>
        {filteredArticles.map((article) => (
          <ListItem key={article.id} disableGutters>
            <ListItemButton onClick={() => onArticleSelected(article)} key={article.id}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <ApartmentIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={article.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Dialog>
    </>
  );
}
