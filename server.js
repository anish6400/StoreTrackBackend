const express = require('express');
const app = express();
const port = 5000;

app.get("/", function(req, res) {
    return res.send("hello ma chudua");
})

// server listening at the port
app.listen(port, function(){
    console.log(`App listening at port number: ${port}`);
});