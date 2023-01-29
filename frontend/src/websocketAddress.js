
export default function websocketAddress() {
  var loc = window.location, new_uri;
  new_uri = 'wss://';
  if (loc.port === '3000') {
    new_uri += 'localhost:443';
  } else {
    new_uri += loc.hostname;
    new_uri += ':';
    new_uri += loc.port;
  }
  new_uri += loc.pathname + 'ws';

  const websocketAddr = new_uri;
  return websocketAddr;
}
