import 'whatwg-fetch';
import _ from 'lodash';

const MAX_ROWS_PER_QUERY = 5000;
const MIN_CHECKOUTS = 50;
const BASE_URI = 'https://data.seattle.gov/resource/tjb6-zsmc.json?';

// Fetc and return data using the given options
function fetchData(options) {
    return fetch(BASE_URI + options, {
        headers: {
            'X-App-Token': 'ovTAeUgEKNOZ1ScysPB7ZLJbo'
        }
    })
        .then((response) => {
            return response.json();
        }).catch((error) => {
            console.log(error);
        });
}

// Fetch data from a year and month
export function fetchMonthData(year, month) {
    let options = '$limit=' + MAX_ROWS_PER_QUERY +
        '&$where=checkouts >= ' + MIN_CHECKOUTS +
        ' AND checkoutyear = ' + year + ' AND checkoutmonth = ' + month;
    return fetchData(options);
}

// Fetch data by its title
export function fetchDataByTitle(title) {
    let options = '$where=title = "' + encodeURIComponent(title) + '"';
    return fetchData(options);
}

// Determine whether or not a row should be included based on filters
export function filterRow(rows, filters) {
    let filteredData = [];
    rows.forEach((row) => {
        if (
            // Match month and year
            parseInt(row.checkoutmonth, 10) !== filters.month ||
            parseInt(row.checkoutyear, 10) !== filters.year ||

            // Match fields with search queries
            (row.title && row.title.toLowerCase().indexOf(filters.title) === -1) ||
            (row.subjects && row.subjects.toLowerCase().indexOf(filters.subject) === -1) ||
            (row.creator && row.creator.toLowerCase().indexOf(filters.creator) === -1) ||
            (row.publisher && row.publisher.toLowerCase().indexOf(filters.publisher) === -1) ||
            (filters.type && filters.type !== 'All' && row.materialtype !== filters.type) ||

            // Exclude results if user makes a search but that item doesn't have that field
            (!row.subjects && filters.subject !== '') ||
            (!row.creator && filters.creator !== '') ||
            (!row.publisher && filters.publisher !== '') ||

            // Exclude results without valid titles
            (row.title === '<Unknown Title>') ||
            (row.title.indexOf('Uncataloged') !== -1)
        ) {
            return;
        }

        // Add row
        filteredData.push(row);
    });

    return filteredData;
}

// Sorting functions for table 
// Sort based on number of checkouts, break ties with title
export function sortByCheckouts(a, b, reverse) {
    let diff = parseInt(a.checkouts, 10) - parseInt(b.checkouts, 10);
    if (diff === 0) {
        diff = a.title > b.title ? 1 : -1;
    }

    return diff * reverse;
}

// Sort based on type, break ties with number of checkouts
export function sortByType(a, b, reverse) {
    let diff = 0;
    if (a.materialtype < b.materialtype) {
        diff = -1;
    } else if (a.materialtype > b.materialtype) {
        diff = 1;
    } else {
        diff = sortByCheckouts(a, b, -reverse);
    }

    return diff * reverse;
}

// Sort based on title, break ties with number of checkouts
export function sortByTitle(a, b, reverse) {
    let diff = 0;
    if (a.title < b.title) {
        diff = -1;
    } else if (a.title > b.title) {
        diff = 1;
    } else {
        diff = sortByCheckouts(a, b, -reverse);
    }

    return diff * reverse;
}

// Get checkouts over time given a work's title
export function checkoutsOverTime(title) {
    return fetchDataByTitle(title)
        .then((data) => {
            // Alter data to be more chart-friendly
            return data.map((row) => {
                return { "Month": row.checkoutyear + '/' + row.checkoutmonth, "Checkouts": parseInt(row.checkouts, 10) };
            });
        })
        .then((popularity) => {
            // Sort entries to be in chronological order
            popularity = popularity.sort((a, b) => {
                // Compare year
                let yearA = a.Month.substring(0, 4);
                let yearB = b.Month.substring(0, 4);
                if (yearA < yearB) {
                    return -1;
                } else if (yearA > yearB) {
                    return 1;
                } else {
                    // Years are the same, compare month
                    let monthA = parseInt(a.Month.substring(5), 10);
                    let monthB = parseInt(b.Month.substring(5), 10);
                    let diff = monthA - monthB;
                    if (diff === 0) {
                        // Both year and month are the same, order by checkouts
                        return b.Checkouts - a.Checkouts;
                    } else {
                        return diff;
                    }
                }
            });

            // Remove duplicate dates
            return _.uniqWith(popularity, (a, b) => a.Month === b.Month);
        }).catch((error) => {
            console.log('Could not build chart: ' + error);
        });
}