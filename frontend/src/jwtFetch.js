export default async function fetchWithToken(addr, fields, userToken, setUserToken, setSnackbar) {
  var response = await fetch(addr, fields);
  if (!response.ok) {
    if (response.status === 400) {
      const renewResponse = await fetch('/api/renew', {
        method : 'GET',
        headers : {'Content-Type' : 'application/json', token : userToken}
      });
      if (!renewResponse.ok) {
        setUserToken(null);
        setSnackbar({ children: 'Session beendet', severity: 'warning' });
        return null;
      } else {
        const renewJson = await renewResponse.json();
        setUserToken(renewJson.token);
        fields.headers.token = renewJson.token;
        response = await fetch(addr, fields);
      }
    } else {
      setUserToken(null);
      setSnackbar({ children: 'Irgendwas lief da schief', severity: 'error' });
      return null;
    }
  }
  return response;
}
