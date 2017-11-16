import React, { Component } from 'react';
import 'whatwg-fetch';
import { Button, Table, Form, FormGroup, Label, Input, Row, Col, Progress, Collapse, Badge, Alert } from 'reactstrap';
import { DateTimePicker } from 'react-widgets';
import _ from 'lodash';
import { FaSort, FaSortAsc, FaSortDesc } from 'react-icons/lib/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';

import * as DataModel from './DataModel';

// App that contains all page content
class App extends Component {

  constructor(props) {
    super(props);

    // Initialize state
    this.state = {
      data: undefined,
      filteredData: undefined,
      filters: {}
    };
  }

  // Update data filters
  updateFilters(title, subject, creator, publisher, date, type) {
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let dateChanged = this.state.filters.month !== month || this.state.filters.year !== year;
    let newType = dateChanged ? 'All' : type;
    let newState = {
      filters: {
        title: title,
        subject: subject,
        creator: creator,
        publisher: publisher,
        month: month,
        year: year,
        type: newType
      }
    };

    // Update state
    this.setState(newState, () => {
      // If date changed, new data needs to be fetched
      if (dateChanged) {
        this.setState({ data: undefined });
        DataModel.fetchMonthData(year, month).then((data) => {
          console.log('Fetched ' + data.length + ' rows.');
          let newState = { data: data };
          this.setState(newState, () => { console.log('Loaded rows.'); });
        });
      }
    });
  }

  render() {
    // Types of media available in this set
    let checkoutTypes = Object.keys(_.groupBy(this.state.data, 'materialtype'));

    let whatToDisplay;
    if (_.isEmpty(this.state.filters)) { // Need to select a month and date
      whatToDisplay = <Alert color="info">Select a month to get started!</Alert>;
    } else if (this.state.data === undefined) { // Currently fetching/processing data
      whatToDisplay = <Progress animated value="100">Fetching data...</Progress>;
    } else { // Data fully processed, display table
      whatToDisplay = <DataTable data={this.state.data} filters={this.state.filters} />;
    }

    return (
      <div className='container'>
        <header>
          <h1>Seattle Public Library Checkouts</h1>
        </header>

        <main>
          <Row>
            <Col xs="9">
              {whatToDisplay}
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
          <p>Data from <a href='https://data.seattle.gov/Community/Checkouts-by-Title/tmmm-ytt6'>https://data.seattle.gov/Community/Checkouts-by-Title/tmmm-ytt6</a>.</p>

          <p>Only items which have been checked out at least 50 times are retrieved.</p>
        </footer>
      </div>
    );
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
      data: this.props.data,
      filters: this.props.filters
    };
  }

  // Initial filtering
  componentDidMount() {
    this.filterData();
  }

  render() {
    // Create a row for each data entry
    let data = this.state.data.map((row, i) => {
      let key = row.checkoutmonth + '-' + row.checkoutyear + '-' + row.title + '-' + i;
      return <TableRow key={key} data={row} fullData={this.props.data} />;
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

  // If filters changed, re-filter the data
  componentWillReceiveProps(nextProps) {
    if (nextProps.filters !== this.state.filters) {
      this.setState({ filters: nextProps.filters }, () => this.filterData());
    }
  }

  // Filter the data based on table's current filters
  filterData() {
    let filters = this.state.filters;
    let filteredData = DataModel.filterRow(this.props.data, filters);

    // Update data and re-sort
    this.setState({ data: filteredData }, () => this.sortData(this.state.sortCol, true));
  }

  // Sort data based on column
  sortData(col, dontSwitch) {
    // Don't sort if no column has been selected
    if (col !== '') {
      let newState = { sortDir: this.state.sortDir, sortCol: col };

      // Change sort direction if same column is clicked multiple times
      if (this.state.sortCol === col && !dontSwitch) {
        newState.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
      }

      // Different sorting method depending on column
      let sortFn;
      if (col === 'Type') {
        sortFn = DataModel.sortByType;
      } else if (col === 'Title') {
        sortFn = DataModel.sortByTitle;
      } else {
        sortFn = DataModel.sortByCheckouts;
      }

      let reverse = newState.sortDir === 'asc' ? 1 : -1;
      newState.data = this.state.data.sort((a, b) => sortFn(a, b, reverse));
      this.setState(newState);
    }
  }
}

// Header row for the data table
class TableHeader extends Component {
  render() {
    let headers = this.props.cols.map((colName, i) => {
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
        <th key={colName}>
          <Button outline size="sm" color="secondary"
            onClick={() => { this.props.sortCallback(colName) }}
            tabIndex={i + 1}
            style={{
              "cursor": "pointer",
            }}>
            <span style={{ "whiteSpace": "nowrap" }}>
              {colName}
              {icon}
            </span>
          </Button>
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

    // Initialize state
    this.state = {
      collapse: false,
      chart: undefined
    };
  }

  // Create a line chart of a work's checkouts over time
  renderChart() {
    // Don't re-render if it's already been made!
    if (this.state.chart === undefined) {
      let row = this.props.data;
      DataModel.checkoutsOverTime(row.title)
        .then((popularity) => {
          let lineChart = (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={popularity}>
                <Line type="monotone" dataKey="Checkouts" stroke="#8884d8" dot={false} />
                <XAxis dataKey="Month" />
                <YAxis />
                <Tooltip />
                <CartesianGrid strokeDasharray="3 3" />
                <ReferenceLine x={row.checkoutyear + '/' + row.checkoutmonth} stroke="green" />
              </LineChart>
            </ResponsiveContainer>
          )

          this.setState({ chart: lineChart });
        });
    }
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
        <tr
          onClick={() => { this.toggle() }}
          onKeyUp={(event) => { this.handleKeyUp(event) }}
          style={{ "cursor": "pointer" }}
          role="button"
          tabIndex={10}
        >
          <td>{data.materialtype}</td>
          <td>{data.checkouts}</td>
          <td>{data.title}</td>
        </tr>

        <tr className="row-details">
          <td colSpan="12" style={{ "borderTop": 0, "padding": 0 }}>
            <Collapse
              isOpen={this.state.collapse}
              style={{ "padding": "1rem" }}
              onEntering={() => this.renderChart()}>
              {this.state.chart === undefined &&
                <Progress animated value="100" color="info">Building chart...</Progress>
              }

              {this.state.chart}

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

  // Toggle the collapsed state of the detail row
  toggle() {
    let newState = { collapse: !this.state.collapse };
    this.setState(newState);
  }

  // If the user presses enter, toggle the row details
  handleKeyUp(event) {
    if (event.key === "Enter") {
      this.toggle();
    }
  }
}

// Filtering options, including search, month picker, and media type
class Options extends Component {

  constructor(props) {
    super(props);

    // Initialize state
    this.state = {
      date: undefined,
      title: '',
      subject: '',
      creator: '',
      publisher: '',
      type: ''
    }
  }

  render() {
    // Add options for type filtering
    let typeSelect = this.props.types.map((type) => {
      return <option key={type}>{type}</option>;
    });

    // Add search boxes
    let searchForms = ['Title', 'Subject', 'Creator', 'Publisher'];
    let searchFormGroups = searchForms.map((field) => {
      let disabled = this.state.date === undefined;
      return (
        <FormGroup key={field}>
          <Label for={field}>{field}</Label>
          <Input name={field} id={field} placeholder="Search..." disabled={disabled} tabIndex="5"
            onBlur={(e) => this.handleFormChange(e)} />
        </FormGroup>
      )
    });

    // Set calendar bounds
    let maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() - 1);
    let minDate = new Date(2005, 4, 1);

    return (
      <Form>
        <h2>Filters</h2>
        <FormGroup>
          <Label for="date">Month and Year</Label>
          <DateTimePicker
            name="date"
            value={this.state.date}
            onChange={(value) => this.handleDateChange(value)}
            tabIndex="4"
  
            format={'MMM YYYY'}
            time={false}
            footer={false}
            max={maxDate}
            min={minDate}
            views={['year', 'decade']}
          />
        </FormGroup>

        {searchFormGroups}

        {typeSelect.length > 0 &&
          <FormGroup>
            <Label for="typeSelect">Type</Label>
            <Input type="select" name="type" id="typeSelect" tabIndex="6"
              onChange={(e) => this.handleFormChange(e)}>
              <option>All</option>
              {typeSelect}
            </Input>
          </FormGroup>
        }
      </Form>
    )
  }

  // Update state when forms are updated
  handleFormChange(event) {
    let target = event.target.name.toLowerCase();
    let value = event.target.value;

    if (this.state[target] !== value) {
      let newState = {};
      newState[target] = value;
      this.setState(newState, () => { this.updateFilters() });
    }
  }

  // Update date if new valid date is picked
  handleDateChange(value) {
    if (value !== null && value !== this.state.date) {
      let newState = { date: value };
      this.setState(newState, () => { this.updateFilters() });
    }
  }

  // Send the filters up to the app
  updateFilters() {
    this.props.filterCallback(this.state.title, this.state.subject, this.state.creator, this.state.publisher, this.state.date, this.state.type);
  }
}

export default App;
