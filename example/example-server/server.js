/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')

const express = require('express')

const port = process.env.PORT || 3000

const app = express()
app.disable('x-powered-by')
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/redirect', function (req, res) {
    res.redirect('/')
})

app.get('/headers', function (req, res) {
    res.json(req.headers)
})

app.get('/query', function (req, res) {
    res.json(req.query)
})

app.post('/body', function (req, res) {
    res.json(req.body)
})

app.post('/cookie', function (req, res) {
    res.cookie(req.body.key, req.body.value)
    res.sendStatus(200)
})

function sleep() {
    return new Promise(resolve => setTimeout(resolve, 100))
}

app.get('/stream', async function (req, res) {
    res.status(200)
    for (let i = 0; i < 10; i++) {
        res.write(`${i+1}\n`)
        await sleep()
    }
    res.end()
})

app.get('/healthz', function (req, res) {
    res.sendStatus(200)
})

app.get('/readyz', function (req, res) {
    res.sendStatus(200)
})

app.use(function (req, res) {
    res.sendStatus(404)
})

app.use(function (err, req, res) {
    console.error(err)
    res.sendStatus(500)
})

app.listen(port, function () {
    console.log(`Listening on port ${port}...`)
})
