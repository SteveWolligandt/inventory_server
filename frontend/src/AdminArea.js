import React from 'react';
import AdminAreaUsers from './AdminAreaUsers.js';
import AdminAreaTopMenu from './AdminAreaTopMenu.js';

export const State = {
  Top : 'Top',
  Users : 'Users',
};
export default function AdminArea({open, userToken, setUserToken, setSnackbar, setTopBarContext}) {
  const [currentState, setCurrentState] =  React.useState(State.Top);
  if (!open) { return null; }
  return (<>
    <AdminAreaTopMenu
        adminState={currentState}
        setAdminState={setCurrentState}
        userToken={userToken}
        setUserToken={setUserToken}
        setSnackbar={setSnackbar}
        setTopBarContext={setTopBarContext}
    />
    <AdminAreaUsers
      adminState={currentState}
      setAdminState={setCurrentState}
      userToken={userToken}
      setUserToken={setUserToken}
      setSnackbar={setSnackbar}
      setTopBarContext={setTopBarContext}
    />
  </>)
}
