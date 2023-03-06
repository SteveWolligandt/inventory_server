
export default function websocketAddress() {
  var loc = window.location, new_uri;
  new_uri = 'wss://';
  new_uri += loc.hostname;
  new_uri += ':';
  if (loc.port === '3000') {
    new_uri += '443';
  } else {
    new_uri += loc.port;
  }
  new_uri += loc.pathname + 'ws';
  return new_uri;
}
