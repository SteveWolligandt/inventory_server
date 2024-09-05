
export default function websocketAddress() {
  var loc = window.location, new_uri;

  var useSSL = true;
  if (useSSL) {
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
  else {
    new_uri = 'ws://';
    new_uri += loc.hostname;
    new_uri += ':8080';
    new_uri += loc.pathname + 'ws';
  }
  return new_uri;
}
