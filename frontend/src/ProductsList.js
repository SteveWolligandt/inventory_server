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

export default function ProductsList({
  open,
  onProductSelected,
  userToken,
  setUserToken,
  company,
  setSnackbar,
}) {
  const [allProducts, setAllProducts] = React.useState([]);
  const [filteredProducts, setFilteredProducts] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const searched = React.useRef("");
  
  const loadProducts = () => {
    if (!open)             { setAllProducts([]);setFilteredProducts([]); return; }
    if (userToken == null) {return;}
    const loadData = async() => {
      setIsLoading(true);
      try {
        const response = await fetchWithToken(
          '/api/company/' + company.id + '/products', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        }, userToken, setUserToken, setSnackbar)
        if (!response.ok) {
          console.log('nich ok');
          return;}
        const products = await response.json();
        console.log(products);
        products.sort((product1, product2) => {
          const name1 = product1.name.toUpperCase();
          const name2 = product2.name.toUpperCase();
          return (name1 < name2) ? -1 : (name1 > name2) ? 1 : 0;
        });
        setAllProducts(products);
        setFilteredProducts(products);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    loadData();
  };
  React.useEffect(loadProducts, [open, userToken]);

  if (!open) {return null;}

  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
      <CircularProgress /></div>);
  };
  const requestSearch = (event) => {
    const filteredItems = allProducts.filter((product) => {
      console.log(product);
      //return true
      return product.name.toUpperCase().includes(searched.current.value.toUpperCase());
    });
    setFilteredProducts(filteredItems);
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
        {filteredProducts.map((product) => (
          <ListItem key={product.id} disableGutters>
            <ListItemButton onClick={() => onProductSelected(product)} key={product.id}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <ApartmentIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={product.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Dialog>
    </>
  );
}
