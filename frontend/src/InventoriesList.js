import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
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

export default function Inventories({open, setOpen, onInventorySelected, activeInventory, setActiveInventory}) {
  var [inventories, setInventories] = React.useState([]);
  var [createOpen, setCreateOpen] = React.useState(false);

  const lastMessage = useWebSocket(websocketAddr()).lastMessage;

  const handleWebsocket = () => {
    if (lastMessage !== null) {
      let msg = JSON.parse(lastMessage.data);
      console.log(msg);
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

  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/inventories');
        const inventoriesJson = await response.json();
        var cs = [];
        for (var inventory in inventoriesJson) {
          if (inventoriesJson.hasOwnProperty(inventory)) {
            cs.push({id:inventoriesJson[inventory].id, name:inventoriesJson[inventory].name});
          }
        }
        setInventories(cs);
      } catch (error) {
        console.error(error);
      }
    }
    loadData();
  }, []);

  if (!open) {return null;}
  const handleListItemClick = (inventory) => {
    setActiveInventory(inventory);
    setOpen(false);
    console.log();
  };
  const handleClose = () => {
  };
  return (
    <>
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Inventur auswählen</DialogTitle>
      <List sx={{ pt: 0 }}>
        {inventories.map((inventory) => (
          <ListItem disableGutters>
            <ListItemButton onClick={() => handleListItemClick(inventory)} key={inventory}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={inventory.name} />
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
                           setActiveInventory={setActiveInventory}/>
    </>
  );
}
