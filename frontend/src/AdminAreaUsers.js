import AddCircleIcon from '@mui/icons-material/AddCircle';
import Paper from '@mui/material/Paper';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import {DataGrid} from '@mui/x-data-grid';
import React from 'react';

import EditUserDialog from './EditUserDialog.js';
import AddUserDialog from './AddUserDialog.js';
import {State} from './AdminArea.js';

import fetchWithToken from './jwtFetch.js';

export default function AdminAreaUsers(
    {adminState, setAdminState, userToken, setUserToken, setSnackbar, setTopBarContext}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  var selectedUserRef = React.useRef(null);
  React.useEffect(() => {
    const loadUsers = async () => {
      if (adminState === State.Users) {
        setTopBarContext([{
          key:'newUser',
          label:'Neuer Benutzer',
          icon:()=>(<AddCircleIcon/>),
          onClick:()=>setShowAddDialog(true)}]);

        setIsLoading(true);
        try {
          const response = await fetchWithToken('/api/users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', token:userToken},
          }, userToken, setUserToken, setSnackbar)
          if (response == null) {return;}
          const usersJson = await response.json();
          var us = [];
          for (var i in usersJson) {
            if (usersJson.hasOwnProperty(i)) {
              usersJson[i]['id'] = usersJson[i].name;
              us.push(usersJson[i]);
            }
          }
          setUsers(us);
        } catch (error) {
          console.error(error);
        }
        setIsLoading(false);


      }
    }; loadUsers();}, [adminState]);

  if (adminState !== State.Users) {return null;}
  const onEdit = (user) => {
    selectedUserRef.current = user;
    setShowEditDialog(true);
  }
  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
        <CircularProgress />
      </div>);
  };
  const renderDataGrid = () => {
    return(
    <Paper elevation="5" sx={{ overflow: 'hidden', 'marginLeft':'30px' , 'marginRight':'50px', height:'calc(100vh - 110px)' }}>
    <DataGrid
      rows={users}
      columns={columns(onEdit)}
      checkboxSelection={true}
    />
    </Paper>);
  };
  return (<>
    <Box sx={{m:'3', justifyContent:"center", alignItems:"center"}}>
      <Button onClick={()=>setAdminState('Top')}>Back</Button>
    </Box>
    {renderLoading()}
    {renderDataGrid()}

    <AddUserDialog
      open={showAddDialog}
      setOpen={setShowAddDialog}
      userToken={userToken}
      setUserToken={setUserToken}
      setSnackbar={setSnackbar}
    />
    <EditUserDialog
      open={showEditDialog}
      setOpen={setShowEditDialog}
      user={selectedUserRef}
      userToken={userToken}
      setUserToken={setUserToken}
      setSnackbar={setSnackbar}/>
  </>)
}

function columns(onEdit) {
  return [
    { field:          'name',
      headerName:     'Name',
      flex:           1,
      headerAlign:    'center',
      hideable:       false,
      align:          'center',
      disablePadding: true,
    },
    { field:          'isAdmin',
      headerName:     'Administrator',
      flex:           1,
      type:           'boolean',
      hideable:       false,
      headerAlign:    'center',
      align:          'center',
      disablePadding: false,
    },
    { field:          'edit',
      headerName:     '',
      headerAlign:    'center',
      align:          'center',
      hideable:       false,
      width:          60,
      sortable:       false,
      disablePadding: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation(); // don't select this row after clicking
          onEdit(params.row);
        };

        return <IconButton size="small"
                           aria-label="gotoCompany"
                           onClick={onClick}>
                 <EditIcon fontSize="small" />
               </IconButton>;
      }
    }
  ];
}
