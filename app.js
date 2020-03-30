let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let axios = require("axios");
let cheerio = require("cheerio");
const fs = require('fs');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

const page = "https://www.sanantonio.gov/health/news/alerts/coronavirus";

let pageData = null;
let json = {};

let rawdata = fs.readFileSync('./data/zip_code.json');
let zipCodesData = JSON.parse(rawdata);

axios.get(page)
    .then(function (response) {
        pageData = cheerio.load(response.data);

        //Parse scrapped data
        let cases_one_to_four = parseCasesByZipCode(1);
        let cases_five_to_eight = parseCasesByZipCode(2);
        let cases_nine_to_twelve = parseCasesByZipCode(3);

        //Add GeoLocation to Zipcodes
        let data = {
            "cases_one_to_four" : parseGeo(cases_one_to_four),
            "cases_five_to_eight": parseGeo(cases_five_to_eight),
            "cases_nine_to_twelve": parseGeo(cases_nine_to_twelve)
        };
        json = {zipCodeCases: data};
        fs.writeFileSync('satx-covid-19.json', JSON.stringify(json));


    })
    .catch(function (error) {
        // handle error
        console.log(error);
    });

function parseCasesByZipCode(index) {
    return pageData(".covidZipTable > tbody > tr > td:nth-child(" + index + ")").text().trim().replace(/(\r\n|\n|\r)/gm, "").split(" ").filter(Boolean)
}

function parseGeo(data){
    let dataConv = [];
    for (let i = 0; i < data.length; i++) {
        let zipGeo = findZipcode(data[i]);
        if (zipGeo){
            let objectGeo = {
                zipcode: data[i],
                geo: zipGeo
            };
            dataConv.push(objectGeo);
        }
    }
    return dataConv;
}

function findZipcode(zipcode) {
    for (let i = 0; i < zipCodesData.length; i++) {
        let zipData = zipCodesData[i];
        if (zipData.fields.zip === zipcode) {
            return zipData.fields.geopoint;
        }
    }
}

module.exports = app;
