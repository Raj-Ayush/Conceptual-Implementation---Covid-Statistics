const express = require('express')
const app = express()
const bodyParser = require("body-parser");
const port = 8080

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const { connection } = require('./connector')
const covidTallyModel = connection;

app.get('/totalRecovered', async (req, res) =>{
    const totalRecovered = await covidTallyModel.aggregate([
        {
            $group: {
                _id: "total",
                // accumulator
                // resultKey: { $accumulationOperator: "$field to accumulate" or a constan value}
                recovered: { $sum : "$recovered" },
                //count : { $sum : 1}
            },
        },
    ]);
    const firstResult = totalRecovered[0];
    res.send({ data : firstResult});
});

app.get('/totalActive', async (req, res) =>{
    const firstOne = await covidTallyModel.aggregate([
        {
            $group: {
                _id: "total",
                recovered: { $sum : "$recovered" },
            },
        },
    ]);
    const totalRecovered = firstOne[0];
    const secondOne = await covidTallyModel.aggregate([
        {
            $group: {
                _id: "total",
                infected: { $sum : "$infected"},
            },
        },
    ]);
    const totalInfected = secondOne[0];
    res.send({ data : { _id : totalInfected._id, active: totalInfected.infected - totalRecovered.recovered}});
});



app.get('/totalDeath', async (req, res) =>{
    const totalRecovered = await covidTallyModel.aggregate([
        {
            $group: {
                _id: "total",
                // accumulator
                // resultKey: { $accumulationOperator: "$field to accumulate" or a constan value}
                death: { $sum : "$death" },
                //count : { $sum : 1}
            },
        },
    ]);
    const firstResult = totalRecovered[0];
    res.send({ data : firstResult});
});

app.get('/hotspotStates', async (req, res) => {
    const gethotspotStates = await covidTallyModel.aggregate([
        {
            $project: {
                _id: false,
                state: "$state",
                rate: {
                    $round:[
                        {
                            $divide:[
                                { $subtract: ["$infected", "$recovered"]},
                                "$infected"]
                        }, 
                        5,
                    ],
                },
            },
        },
        {
            $match: {
                rate: { $gt: 0.1 }
            }
        }
    ]);
    res.send({ data: gethotspotStates});
});

app.get('/healthyStates', async (req, res) => {
    const getHealthyStates = await covidTallyModel.aggregate([
        {
            $project:{
                _id: false,
                state: "$state",
                mortality: { 
                    $round:[
                        {
                            $divide: ["$death", "$infected"]
                        }, 
                        5,
                    ]
                },
            },
        },
        {
            $match:{
                mortality: { $lt: 0.005 }
            }
        }
    ]);
    res.send({data:getHealthyStates});
})

app.listen(port, () => console.log(`App listening on port ${port}!`))

module.exports = app;