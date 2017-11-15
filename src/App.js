import React, { Component } from 'react';
import 'whatwg-fetch';
import { Table, Form, FormGroup, Label, Input, Row, Col, Progress, Collapse, Badge, Alert } from 'reactstrap';
import { DateTimePicker } from 'react-widgets';
import _ from 'lodash';
import { FaSort, FaSortAsc, FaSortDesc } from 'react-icons/lib/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// App that contains all page content
class App extends Component {

  constructor(props) {
    super(props);

    // Initialize state
    let initDate = new Date();
    this.state = {
      data: undefined,
      filteredData: undefined,
      filters: {
        title: '',
        subject: '',
        creator: '',
        publisher: '',
        month: initDate.getMonth() + 1,
        year: initDate.getFullYear()
      }
    };
  }

  updateFilters(title, subject, creator, publisher, date) {
    let newState = {
      filters: {
        title: title,
        subject: subject,
        creator: creator,
        publisher: publisher,
        month: date.getMonth() + 1,
        year: date.getFullYear()
      }
    }
    this.setState(newState);
  }

  render() {
    let checkoutTypes = Object.keys(_.groupBy(this.state.data, 'materialtype'));

    return (
      <div className='container'>
        <header>
          <h1>Seattle Public Library Checkouts</h1>
        </header>

        <main>
          <Row>
            <Col xs="9">

              { // Show progress bar if data has not yet fully loaded
                this.state.data === undefined &&
                <Progress animated value="100">Fetching data...</Progress>
              }

              { // If data is loaded, display table of data
                this.state.data !== undefined &&
                <DataTable data={this.state.data} filters={this.state.filters} />
              }
            </Col>

            <Col xs="3">
              <Options
                types={checkoutTypes}
                filterCallback={(title, subject, creator, publisher, month, year) => {
                  this.updateFilters(title, subject, creator, publisher, month, year);
                }}
              />
            </Col>
          </Row>
        </main>

        <footer>
          Data from <a href='https://data.seattle.gov/Community/Checkouts-by-Title/tmmm-ytt6'>https://data.seattle.gov/Community/Checkouts-by-Title/tmmm-ytt6</a>.
        </footer>
      </div>
    );
  }

  componentDidMount() {
    // Fetch data
    fetch('https://data.seattle.gov/resource/tjb6-zsmc.json?$limit=30000&$where=checkouts > 40', {
      headers: {
        'X-App-Token': 'ovTAeUgEKNOZ1ScysPB7ZLJbo'
      }
    })
      .then((response) => {
        return response.json()
      })
      .then((data) => {
        // Successfully fetched; update app state
        console.log('Fetched ' + data.length + ' rows.');
        console.log(data);
        let newState = { data: data };
        this.setState(newState);
      })
      .catch((error) => {
        console.log(error);
      })
  }
}

// Table displaying all data
class DataTable extends Component {

  constructor(props) {
    super(props);

    // Initialize state
    this.state = {
      sortCol: '',
      sortDir: 'desc',
      sortedData: this.props.data
    };
  }

  render() {
    // Create a table entry for each item
    let filters = this.props.filters;
    let data = [];

    this.state.sortedData.forEach((row, i) => {
      // Apply filters
      if (
        // Match month and year
        parseInt(row.checkoutmonth, 10) !== filters.month ||
        parseInt(row.checkoutyear, 10) !== filters.year ||

        // Match fields with search queries
        (row.title && row.title.toLowerCase().indexOf(filters.title) === -1) ||
        (row.subjects && row.subjects.toLowerCase().indexOf(filters.subject) === -1) ||
        (row.creator && row.creator.toLowerCase().indexOf(filters.creator) === -1) ||
        (row.publisher && row.publisher.toLowerCase().indexOf(filters.publisher) === -1) ||

        // Exclude results if user makes a search but that item doesn't have that field
        (!row.subjects && filters.subject !== '') ||
        (!row.creator && filters.creator !== '') ||
        (!row.publisher && filters.publisher !== '')) {
        return;
      }

      // Create popularity chart
      let lineChart = undefined;
      let popularity = [];
      this.props.data.forEach((otherRow) => {
        if (row.title === otherRow.title) {
          popularity.push({ "Month": otherRow.checkoutyear + '/' + otherRow.checkoutmonth, "Checkouts": parseInt(otherRow.checkouts, 10) });
        }
      });
      if (popularity.length > 1) {
        popularity = popularity.sort((a, b) => {
          let yearA = a.Month.substring(0, 4);
          let yearB = b.Month.substring(0, 4);
          if (yearA < yearB) {
            return -1;
          } else if (yearA > yearB) {
            return 1;
          } else {
            let monthA = parseInt(a.Month.substring(5), 10);
            let monthB = parseInt(b.Month.substring(5), 10);
            return monthA - monthB;
          }
        });
        
        console.log(popularity)
        lineChart = (<LineChart width={400} height={200} data={popularity} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Line type="monotone" dataKey="Checkouts" stroke="#8884d8" dot={false} />
          <XAxis dataKey="Month" label="Month" />
          <YAxis label="Checkouts" />
          <Tooltip />
          <CartesianGrid strokeDasharray="3 3" />
        </LineChart>)
      }

      // Add row
      let key = row.checkoutmonth + '-' + row.checkoutyear + '-' + row.title + '-' + i;
      data.push(<TableRow key={key} data={row} chart={lineChart} />);
    });

    return (
      <Table hover responsive size="sm">
        <TableHeader
          cols={['Type', 'Checkouts', 'Title']}
          sortCallback={(col) => { this.sortData(col) }}
          sortCol={this.state.sortCol}
          sortDir={this.state.sortDir}
        />

        {data.length > 0 && data}
        {data.length === 0 &&
          <tbody>
            <tr>
              <td colSpan="12">
                <Alert color="warning">No results found for these filters!</Alert>
              </td>
            </tr>
          </tbody>
        }
      </Table>
    )
  }

  sortData(col) {
    let newState = { sortDir: this.state.sortDir, sortCol: col };

    if (this.state.sortCol === col) {
      newState.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
    }

    let sortFn;
    if (col === 'Type') {
      sortFn = (a, b) => this.sortByType(a, b, reverse);
    } else if (col === 'Title') {
      sortFn = (a, b) => this.sortByTitle(a, b, reverse);
    } else {
      sortFn = (a, b) => this.sortByCheckouts(a, b, reverse);
    }

    let reverse = newState.sortDir === 'asc' ? 1 : -1;
    newState.sortedData = this.state.sortedData.sort(sortFn)
    this.setState(newState);
  }

  sortByCheckouts(a, b, reverse) {
    let diff = parseInt(a.checkouts, 10) - parseInt(b.checkouts, 10);
    if (diff === 0) {
      diff = a.title > b.title ? 1 : -1;
    }

    return diff * reverse;
  }

  sortByType(a, b, reverse) {
    let diff = 0;
    if (a.materialtype < b.materialtype) {
      diff = -1;
    } else if (a.materialtype > b.materialtype) {
      diff = 1;
    } else {
      diff = this.sortByCheckouts(a, b, -reverse);
    }

    return diff * reverse;
  }

  sortByTitle(a, b, reverse) {
    let diff = 0;
    if (a.title < b.title) {
      diff = -1;
    } else if (a.title > b.title) {
      diff = 1;
    } else {
      diff = this.sortByCheckouts(a, b, -reverse);
    }

    return diff * reverse;
  }
}

// Header row for the data table
class TableHeader extends Component {
  render() {
    let headers = this.props.cols.map((colName) => {
      // Set icon to indicate current sort method
      let icon;
      if (colName === this.props.sortCol) {
        if (this.props.sortDir === 'asc') {
          icon = <FaSortAsc />;
        } else {
          icon = <FaSortDesc />;
        }
      } else {
        icon = <FaSort />;
      }

      return (
        <th
          key={colName}
          onClick={() => { this.props.sortCallback(colName) }}
          style={{ "cursor": "pointer" }}>
          <span style={{ "whiteSpace": "nowrap" }}>
            {colName}
            {icon}
          </span>
        </th>
      );
    });

    return (
      <thead>
        <tr>
          {headers}
        </tr>
      </thead>
    )
  }
}

// Represents a row in the table,
// along with a hidden dropdown row with further details and a chart
class TableRow extends Component {

  constructor(props) {
    super(props);
    this.state = { collapse: false };
  }

  render() {
    let data = this.props.data;

    // Split subjects string into individual tags
    let tags = data.subjects;
    if (tags !== undefined) {
      tags = tags.split(", ").map((subject, i) => {
        return <Badge pill color="secondary" key={subject + i}>{subject}</Badge>;
      });
    }

    return (
      <tbody>
        <tr onClick={() => { this.toggle() }} style={{ "cursor": "pointer" }}>
          <td>{data.materialtype}</td>
          <td>{data.checkouts}</td>
          <td>{data.title}</td>
        </tr>

        <tr className="row-details">
          <td colSpan="12" style={{ "borderTop": 0, "padding": 0 }}>
            <Collapse isOpen={this.state.collapse} style={{ "padding": "1rem" }}>
              {this.props.chart}

              {tags !== undefined &&
                <Row>
                  <Col xs="3">Subjects</Col>
                  <Col>{tags}</Col>
                </Row>
              }

              {data.creator !== undefined &&
                <Row>
                  <Col xs="3">Creator</Col>
                  <Col>{data.creator.replace(/[^a-zA-Z0-9]$/g, "")}</Col>
                </Row>
              }

              {data.publisher !== undefined &&
                <Row>
                  <Col xs="3">Publisher</Col>
                  <Col>{data.publisher.replace(/[^a-zA-Z0-9]$/g, "")}</Col>
                </Row>
              }

              {data.publicationyear !== undefined &&
                <Row>
                  <Col xs="3">Published</Col>
                  <Col>{data.publicationyear.replace(/[^0-9]/g, "")}</Col>
                </Row>
              }
            </Collapse>
          </td>
        </tr>
      </tbody>
    )
  }

  toggle() {
    let newState = { collapse: !this.state.collapse };
    this.setState(newState);
  }
}

// Filtering options, including search, month picker, and media type
class Options extends Component {

  constructor(props) {
    super(props);
    this.state = {
      date: new Date(),
      title: '',
      subject: '',
      creator: '',
      publisher: ''
    }
  }

  render() {
    let typeCheckboxes = this.props.types.map((type) => {
      return (
        <FormGroup check key={type}>
          <Label check>
            <Input type="checkbox" name="type" defaultChecked />{' ' + type}
          </Label>
        </FormGroup>
      )
    });

    let searchForms = ['Title', 'Subject', 'Creator', 'Publisher'];
    let searchFormGroups = searchForms.map((field) => {
      return (
        <FormGroup key={field}>
          <Label for={field}>{field}</Label>
          <Input name={field} id={field} placeholder="Search..."
            onChange={(e) => this.handleFormChange(e)} />
        </FormGroup>
      )
    });

    return (

      <Form>
        <FormGroup>
          <Label for="date">Month and Year</Label>
          <DateTimePicker
            name="date"
            value={this.state.date}
            onChange={(value) => this.handleDateChange(value)}

            format={'MMM YYYY'}
            time={false}
            footer={false}
            max={new Date()}
            min={new Date(2005, 4, 1)}
            views={['year', 'decade']}
          />
        </FormGroup>

        {searchFormGroups}

        <FormGroup>
          <Label for="type">Type</Label>
          {typeCheckboxes}
        </FormGroup>
      </Form>
    )
  }

  // Update state when forms are updated
  handleFormChange(event) {
    let newState = {};
    newState[event.target.name.toLowerCase()] = event.target.value;
    this.setState(newState, () => { this.updateFilters() });
  }

  // Update date if new valid date is picked
  handleDateChange(value) {
    if (value !== null) {
      let newState = { date: value };
      this.setState(newState, () => { this.updateFilters() });
    }
  }

  // Send the filters up to the app
  updateFilters() {
    this.props.filterCallback(this.state.title, this.state.subject, this.state.creator, this.state.publisher, this.state.date);
  }
}

export default App;
