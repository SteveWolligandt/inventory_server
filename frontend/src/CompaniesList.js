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

export default function CompaniesList({
  open,
  onCompanySelected,
  userToken,
  setUserToken,
  setSnackbar,
}) {
  const [allCompanies, setAllCompanies] = React.useState([]);
  const [filteredCompanies, setFilteredCompanies] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const searched = React.useRef("");
  
  const loadCompanies = () => {
    if (!open)             { setAllCompanies([]);setFilteredCompanies([]); return; }
    if (userToken == null) {return;}
    const loadData = async() => {
      setIsLoading(true);
      try {
        const response = await fetchWithToken('/api/companies', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        }, userToken, setUserToken, setSnackbar)
        if (response == null) {return;}
        const cs = await response.json();
        cs.sort((company1, company2) => {
          const name1 = company1.name.toUpperCase();
          const name2 = company2.name.toUpperCase();
          return (name1 < name2) ? -1 : (name1 > name2) ? 1 : 0;
        });
        setAllCompanies(cs);
        setFilteredCompanies(cs);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    loadData();
  };
  React.useEffect(loadCompanies, [open, userToken]);

  if (!open) {return null;}

  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
      <CircularProgress /></div>);
  };
  const requestSearch = (event) => {
    const filteredItems = allCompanies.filter((company) => {
      console.log(company);
      //return true
      return company.name.toUpperCase().includes(searched.current.value.toUpperCase());
    });
    setFilteredCompanies(filteredItems);
  };

  return (
    <>
    <Dialog open={open}>
      <DialogTitle>Firma auswählen</DialogTitle>
      {renderLoading()}
      <TextField
        type="search"
        inputRef={searched}
        onChange={(searchVal) => requestSearch(searchVal)}
        placeholder="Suchen"
      />
      <List sx={{ pt: 0 }}>
        {filteredCompanies.map((company) => (
          <ListItem key={company.id} disableGutters>
            <ListItemButton onClick={() => onCompanySelected(company)} key={company.id}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <ApartmentIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={company.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Dialog>
    </>
  );
}
