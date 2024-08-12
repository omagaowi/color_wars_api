const express = require('express')

const app = express()

app.get('/', (req, res)=>{
    res.send('server working')
})


app.listen('3000', ()=>{
    console.log('server online at port 3000')
})