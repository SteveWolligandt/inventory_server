
export default function websocketAddress() {
  var loc = window.location, new_uri;
  if (loc.protocol === 'https:') {
    new_uri = 'wss';
  } else {
    new_uri = 'ws';
  }
  new_uri += '://';
  new_uri += loc.hostname;
  new_uri += ':';
  if (loc.port === '3000') {
    new_uri += '8080';
  } else {
    new_uri += loc.port;
  }
  new_uri += loc.pathname + 'ws';

  const websocketAddr = new_uri;
  return websocketAddr;
}
