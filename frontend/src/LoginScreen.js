import * as React from 'react';
import LoginForm from './LoginForm.js';
import RegisterForm from './RegisterForm.js';

export default function LoginScreen({open, onLogin}) {
  var [showLoginForm, setShowLoginForm] = React.useState(true);
  var [showRegisterForm, setShowRegisterForm] = React.useState(false);
  const handleLogin = (token) => { onLogin(token);  setShowLoginForm(false);};

  if (!open) {return null;}
  return (<>
    <LoginForm open={showLoginForm}
               setOpen={setShowLoginForm}
               setShowRegisterForm={setShowRegisterForm}
               onLogin={handleLogin}/>
    <RegisterForm open={showRegisterForm} setOpen={setShowRegisterForm} setShowLoginForm={setShowLoginForm}/>
  </>);
}
