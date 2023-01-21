import * as React from 'react';
import LoginForm from './LoginForm.js';
import RegisterForm from './RegisterForm.js';

export default function LoginScreen({open, onLogin, setSnackbar}) {
  const handleLogin = (token) => {onLogin(token)};

  if (!open) {return null;}
  return (<>
    <LoginForm open={true}
               onLogin={handleLogin}
               setSnackbar={setSnackbar}/>
  </>);
}
