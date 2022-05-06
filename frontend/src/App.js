import BasicTable from './BasicTable.js';

import {Component} from 'react';
import './App.css';

const api = 'http://localhost:8080/api';
const companiesEndPoint = '/companies';
class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      companies:null,
      isLoading:true,
    };
  }

  componentDidMount() {
    var cs = [];
    fetch(api + companiesEndPoint)
      .then(response => response.json())
      .then(companiesJson => {
          console.log(companiesJson);
          for (var company in companiesJson) {
            if (companiesJson.hasOwnProperty(company)) {
              cs.push({id:companiesJson[company].id, name:companiesJson[company].name});
            }
          }
          this.setState({companies:cs, isLoading:false});
        }
      );
  }

  render() {
    const {companies, isLoading} = this.state;
    if (isLoading) {
      return <p>Loading ...</p>;
    }
    return BasicTable(companies);
  }
}
export default App;
