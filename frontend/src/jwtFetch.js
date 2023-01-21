export default async function fetchWithToken(addr, fields, userToken, setUserToken) {
  var response = await fetch(addr, fields);
  if (!response.ok) {
    if (response.status === 400) {
      console.log('Neuer Token wird angefragt');
      const renewResponse = await fetch('/api/renew', {
        method : 'GET',
        headers : {'Content-Type' : 'application/json', token : userToken}
      });
      if (!renewResponse.ok) {
        setUserToken(null);
        console.log('Session beendet');
        return;
      } else {
        const renewJson = await renewResponse.json();
        setUserToken(renewJson.token);
        console.log('Neuer Token wurde erhalten');
        fields.headers.token = renewJson.token;
        response = await fetch(addr, fields);
      }
    } else {
      setUserToken(null);
      console.log('Irgendwas lief da schief');
      return;
    }
  }
  return response;
}
