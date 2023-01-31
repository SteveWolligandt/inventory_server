import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import {DataGrid} from '@mui/x-data-grid';
import React from 'react';
import EditUserDialog from './EditUserDialog.js';

import fetchWithToken from './jwtFetch.js';

export default function AdminAreaUsers({adminState, setAdminState, userToken, setUserToken, setSnackbar}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  var nameRef = React.useRef('');
  React.useEffect(() => {
    const loadUsers = async () => {
      if (adminState === 'Users') {
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

  const onEdit = (user) => {
    nameRef.current = user.name;
    setShowEditDialog(true);
  }
  return (<>
    <Box sx={{m:'3', justifyContent:"center", alignItems:"center"}}>
      <Button onClick={()=>setAdminState('Top')}>Back</Button>
    </Box>
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
    <div style={{height: 'calc(100vh - 110px)', width: '100%'}}>
    <DataGrid
      rows={users}
      columns={columns(onEdit)}
    />
    </div>
    </div>

    <EditUserDialog open={showEditDialog} setOpen={setShowEditDialog} nameRef={nameRef}/>
  </>)
}

function columns(onEdit) {
  return [
    { field: 'name', align:'center', headerAlign:'center', headerName: 'Name', flex: 1 },
    { field: 'isAdmin', align:'center', headerAlign:'center', headerName: 'Administrator', flex: 1 },
    { field: 'edit',
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
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
