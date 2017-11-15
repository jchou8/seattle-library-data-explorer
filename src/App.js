import React, { Component } from 'react';
import 'whatwg-fetch';
import { Table, Form, FormGroup, Label, Input, Row, Col, Progress, Collapse, Badge } from 'reactstrap';
import { DateTimePicker } from 'react-widgets';
import _ from 'lodash';
import Moment from 'moment';

// App that contains all page content
class App extends Component {

  constructor(props) {
    super(props);

    // Initialize state
    this.state = {
      data: undefined
    };
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
                <DataTable data={this.state.data} />
              }
            </Col>

            <Col xs="3">
              <Options types={checkoutTypes} />
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
    fetch('https://data.seattle.gov/resource/tjb6-zsmc.json?$limit=100', {
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
  render() {
    // Create a table entry for each item
    let data = this.props.data.map((row) => {
      let key = row.checkoutmonth + '-' + row.checkoutyear + '-' + row.title;
      return <TableRow key={key} data={row} />;
    });

    return (
      <Table hover size="sm">
        <TableHeader cols={['Type', 'Year', 'Month', 'Checkouts', 'Title']} />
        {data}
      </Table>
    )
  }
}

// Header row for the data table
class TableHeader extends Component {
  render() {
    let headers = this.props.cols.map((colName) => {
      return <th key={colName}>{colName}</th>;
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
          <td>{data.checkoutyear}</td>
          <td>{data.checkoutmonth}</td>
          <td>{data.checkouts}</td>
          <td>{data.title}</td>
        </tr>

        <tr className="row-details">
          <td colSpan="12" style={{ "borderTop": 0, "padding": 0 }}>
            <Collapse isOpen={this.state.collapse} style={{ "padding": "1rem" }}>
              {tags !== undefined &&
                <Row>
                  <Col xs="2">Subjects</Col>
                  <Col>{tags}</Col>
                </Row>
              }

              {data.creator !== undefined &&
                <Row>
                  <Col xs="2">Creator</Col>
                  <Col>{data.creator.replace(/[^a-zA-Z0-9]+$/g, "")}</Col>
                </Row>
              }

              {data.publisher !== undefined &&
                <Row>
                  <Col xs="2">Publisher</Col>
                  <Col>{data.publisher.replace(/[^a-zA-Z0-9]+$/g, "")}</Col>
                </Row>
              }

              {data.publicationyear !== undefined &&
                <Row>
                  <Col xs="2">Published</Col>
                  <Col>{data.publicationyear.replace(/[^a-zA-Z0-9]+$/g, "")}</Col>
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
      date: new Date()
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

    return (
      <Form>
        <FormGroup>
          <Label for="searchTitle">Title</Label>
          <Input name="searchTitle" id="searchTitle" placeholder="Search..." />
        </FormGroup>

        <FormGroup>
          <Label for="searchSubject">Subject</Label>
          <Input name="searchSubject" id="searchSubject" placeholder="Search..." />
        </FormGroup>

        <FormGroup>
          <Label for="searchCreator">Creator</Label>
          <Input name="searchCreator" id="searchCreator" placeholder="Search..." />
        </FormGroup>

        <FormGroup>
          <Label for="searchPublisher">Publisher</Label>
          <Input name="searchPublisher" id="searchPublisher" placeholder="Search..." />
        </FormGroup>

        <FormGroup>
          <Label for="date">Month and Year</Label>
          <DateTimePicker
            value={this.state.date}
            onChange={(value) => this.setState({ date: value })}
            format={ Moment().format("MMM YYYY") }
            time={false}
            footer={false}
            max={new Date()}
            min={new Date(2005, 4, 1)}
            views={['year', 'decade']}
          />
        </FormGroup>

        <FormGroup>
          <Label for="type">Type</Label>
          {typeCheckboxes}
        </FormGroup>
      </Form>
    )
  }
}

export default App;
