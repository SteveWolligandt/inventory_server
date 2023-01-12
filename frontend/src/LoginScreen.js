import * as React from 'react';
import LoginForm from './LoginForm.js';
import RegisterForm from './RegisterForm.js';

export default function LoginScreen(params) {
  var [showLoginForm, setShowLoginForm] = React.useState(true);
  var [showRegisterForm, setShowRegisterForm] = React.useState(false);
  const onLogin = () => { params.setOpen(false); params.setShowLoginForm(false);};

  if (!params.open) {return null;}
  return (<>
    <LoginForm open={showLoginForm}
               setOpen={setShowLoginForm}
               setShowRegisterForm={setShowRegisterForm}
               onLogin={onLogin}/>
    <RegisterForm open={showRegisterForm} setOpen={setShowRegisterForm} setShowLoginForm={setShowLoginForm}/>
  </>);
}
