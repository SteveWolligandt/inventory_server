import AddIcon from '@mui/icons-material/Add';
import fetchWithToken from './jwtFetch.js';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import ApartmentIcon from '@mui/icons-material/Apartment';
import Avatar from '@mui/material/Avatar';
import {blue} from '@mui/material/colors';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';
import useWebSocket from 'react-use-websocket';

import CreateInventoryDialog from './CreateInventoryDialog.js';
import websocketAddr from './websocketAddress.js';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function Inventories(
  {open, setOpen, onInventorySelected, activeInventory, setActiveInventory, userToken, setUserToken, setSnackbar}) {
  var [inventories, setInventories] = React.useState([]);
  var [createOpen, setCreateOpen] = React.useState(false);
  var [isLoading, setIsLoading] = React.useState(false);

  const lastMessage = useWebSocket(websocketAddr()).lastMessage;

  const handleWebsocket = () => {
    if (lastMessage !== null) {
      let msg = JSON.parse(lastMessage.data);
      if (msg.action === 'newInventory') {
        let newInventory = msg.data;
        setInventories(inventories => inventories.concat(newInventory));
      } else if (msg.action === 'updateInventory') {
        let updatedInventory = msg.data;
        setInventories(inventories => inventories.map((inventory, j) => {
          return updatedInventory.id === inventory.id ? updatedInventory : inventory;
        }));
      } else if (msg.action === 'deleteInventory') {
        let deletedInventory = msg.data;
      setInventories(inventories => inventories.filter(inventory => inventory.id !== deletedInventory.id));
      }
    }
  };
  React.useEffect(handleWebsocket, [lastMessage, setInventories]);
  const loadInventories = () => {
    if (!open)             { setInventories([]); return; }
    if (userToken == null) { return; }
    async function loadData() {
      try {
        setIsLoading(true);
        var response = await fetchWithToken('/api/inventories/value', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken}
        }, userToken, setUserToken);
        const inventories = await response.json();
        if (inventories == null) {
          setInventories([]);
        } else {
          setInventories(inventories);
        }
        setIsLoading(false);
      } catch (error) {
        console.error(error);
      }
    }
    loadData();
  };
  React.useEffect(loadInventories, [userToken, setSnackbar, open]);

  if (!open) {return null;}
  const handleListItemClick = (inventory) => {
    setActiveInventory(inventory);
    setOpen(false);
  };
  const handleClose = () => {};
  const renderLoading = () => {
    if (isLoading) {
      return (<Box m="auto"><CircularProgress /></Box>);
    } else {
      return null;
    }
  };
  return (
    <>
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Inventur auswählen</DialogTitle>
      {renderLoading()}
      <List sx={{ pt: 0 }}>
        {inventories.map((inventory) => (
          <ListItem key={inventory.id} disableGutters>
            <ListItemButton onClick={() => handleListItemClick(inventory)} key={inventory.id}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <ApartmentIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={inventory.name + ' - ' + inventory.value + '€'} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disableGutters>
          <ListItemButton
            autoFocus
            onClick={() => setCreateOpen(true)}
          >
            <ListItemAvatar>
              <Avatar>
                <AddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="Neue Inventur" />
          </ListItemButton>
        </ListItem>
      </List>
    </Dialog>
    <CreateInventoryDialog open={createOpen}
                           setOpen={setCreateOpen}
                           setSnackbar={setSnackbar}
                           setActiveInventory={setActiveInventory}
                           userToken={userToken}/>
    </>
  );
}
