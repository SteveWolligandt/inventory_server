import CreateInventoryDialog from './CreateInventoryDialog.js';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import { DataGrid } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Zoom from '@mui/material/Zoom';
import React from 'react';
import useWebSocket from 'react-use-websocket';

import websocketAddr from './websocketAddress.js';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function Inventories({open, onInventorySelected, activeInventory, setActiveInventory}) {
  var [inventories, setInventories] = React.useState([]);
  const [messageHistory, setMessageHistory] = React.useState([]);

  const lastMessage = useWebSocket(websocketAddr()).lastMessage;

  const handleWebsocket = () => {
    if (lastMessage !== null) {
      let msg = JSON.parse(lastMessage.data);
      let action = msg.action;
      //if (action === 'newInventory') {
      //  let newInventory = JSON.parse(msg.data);
      //  setInventories(inventories => inventories.concat(newInventory));
      //} else if (action === 'updateInventory') {
      //  let updatedInventory = msg.data;
      //  setInventories(inventories => inventories.map((company, j) => {
      //    return updatedInventory.id === company.id ? updatedInventory : company;
      //  }));
      //} else if (action === 'deleteInventory') {
      //  let deletedInventory = msg.data;
      //  setInventories(inventories => inventories.filter(company => company.id !== deletedInventory.id));
      //}
    }
  };
  React.useEffect(handleWebsocket, [lastMessage, setInventories]);

  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/inventories');
        const inventoriesJson = await response.json();
        var cs = [];
        for (var company in inventoriesJson) {
          if (inventoriesJson.hasOwnProperty(company)) {
            cs.push({id:inventoriesJson[company].id, name:inventoriesJson[company].name});
          }
        }
        setInventories(cs);
      } catch (error) {
        console.error(error);
      }
    }
    loadData();
  }, []);

  const mutateRow = React.useCallback(
    (company) =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          if (company.name?.trim() === '') {
            reject();
          } else {
            resolve(company);
          }
        }, 200),
      ),
    [],
  );
  const noButtonRef = React.useRef(null);
  const [changeArguments, setChangeArguments] = React.useState(null);
  const [deleteArguments, setDeleteArguments] = React.useState(null);

  const [snackbar, setSnackbar] = React.useState(null);

  const handleCloseSnackbar = () => setSnackbar(null);

  const processRowUpdate = React.useCallback(
    (newRow, oldRow) =>
      new Promise((resolve, reject) => {
        const mutation = computeMutation(newRow, oldRow);
        if (mutation) {
          // Save the arguments to resolve or reject the promise later
          setChangeArguments({ resolve, reject, newRow, oldRow });
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
    [],
  );
  if (!open) {return null;}

  const handleChangeNo = () => {
    const { oldRow, resolve } = changeArguments;
    resolve(oldRow); // Resolve with the old row to not update the internal state
    setChangeArguments(null);
  };

  const handleChangeYes = async () => {
    const { newRow, oldRow, reject, resolve } = changeArguments;

    try {
      const url = '/api/company/' + newRow.id;
      const body = JSON.stringify({name:newRow.name});
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      const response = await mutateRow(newRow);
      setSnackbar({ children: 'Firma in Datenbank geändert', severity: 'success' });
      resolve(response);
      setChangeArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      reject(oldRow);
      setChangeArguments(null);
    }
  };

  const handleDeleteNo = () => {
    setDeleteArguments(null);
  };

  const handleDeleteYes = async () => {
    try {
      const url = '/api/company/' + deleteArguments.id;
      await fetch(url, {
        method: 'DELETE',
      });

      setSnackbar({ children: 'Firma in Datenbank gelöscht', severity: 'success' });
      setDeleteArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      setDeleteArguments(null);
    }
  };

  const handleEntered = () => {
    // The `autoFocus` is not used because, if used, the same Enter that saves
    // the cell triggers "No". Instead, we manually focus the "No" button once
    // the dialog is fully open.
    // noButtonRef.current?.focus();
  };

  const renderDeleteConfirmDialog = () => {
    if (!deleteArguments) {
      return null;
    }
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!deleteArguments}
      >
        <DialogTitle><div style={{color:'red'}}>Firma wirklich löschen?</div></DialogTitle>
        <DialogContent dividers>
          Diese Aktion löscht die Firma <i><b>{deleteArguments.name}</b></i> und alle Artikel der Firma und dessen Stückzahlen!
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleDeleteNo}>
            <div style={{color:'green'}}>Nein</div>
          </Button>
          <Button onClick={handleDeleteYes}>
            <div style={{color:'red'}}>Ja</div>
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  const renderChangeConfirmDialog = () => {
    if (!changeArguments) {
      return null;
    }
    const { newRow, oldRow } = changeArguments;
    const mutation = computeMutation(newRow, oldRow);
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!changeArguments}
      >
        <DialogTitle>Firma wirklich ändern?</DialogTitle>
        <DialogContent dividers>
          {mutation}
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleChangeNo}>
            Nein
          </Button>
          <Button onClick={handleChangeYes}>Ja</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (!open) { return null; }
  const style = {height: 500, width: '100%'};
  return (
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
    <div style={style}>
      {renderChangeConfirmDialog()}
      {renderDeleteConfirmDialog()}
      <DataGrid
        rows={inventories}
        columns={columns(onInventorySelected, setDeleteArguments)}
        processRowUpdate={processRowUpdate}
        experimentalFeatures={{ newEditingApi: true }}
      />
      {!!snackbar && (
        <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
          <Alert {...snackbar} onClose={handleCloseSnackbar} />
        </Snackbar>
      )}
    <CreateInventoryDialog open={open}
                           activeInventory={activeInventory}
                           setActiveInventory={setActiveInventory}/>
    </div>
    </div>
  );
}

function columns(onInventorySelected, setDeleteArguments) {
  return [
    { field: 'name', align:'center', headerAlign:'center', headerName: 'Name', flex: 1, editable: true },
    { field: 'delete',
      editable: false,
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation(); // don't select this row after clicking
          setDeleteArguments(params.row);
        };

        return (<IconButton size="small"
                           aria-label="deleteInventory"
                           onClick={onClick}>
                 <DeleteIcon fontSize="small" />
               </IconButton>);
      }
    },
    { field: 'open',
      editable: false,
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation(); // don't select this row after clicking
          const company = params.row;


          onInventorySelected(company);
        };

        return <IconButton size="small"
                           aria-label="gotoInventory"
                           onClick={onClick}>
                 <ArrowForwardIosIcon fontSize="small" />
               </IconButton>;
      }
    },
  ];
}
