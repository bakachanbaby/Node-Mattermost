// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require('dotenv').config();


const PORT = process.env.PORT || 3000;

app.post('/slash-command', (req, res) => {
    console.log(req.body);
    const response_url = req.body.response_url;

    const dialog = {
        trigger_id: req.body.trigger_id,
        url: 'https://mattermost.updates.vn/dialog-endpoint',
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Sample Dialog',
            elements: [
                {
                    display_name: 'Name',
                    name: 'name',
                    type: 'text',
                    placeholder: 'Enter your name'
                },
                {
                    display_name: 'Email',
                    name: 'email',
                    type: 'text',
                    subtype: 'email',
                    placeholder: 'Enter your email'
                }
            ],
            submit_label: 'Submit',
            notify_on_cancel: true,
        }
    };

    console.log(dialog);

    axios.post(`https://mattermost.updates.vn/api/v4/actions/dialogs/open`, dialog, {
        headers: {
            'Authorization': `Bearer ${process.env.MATTERMOST_ACCESS_TOKEN}`
        }
    })
    .then((e) => {
        res.status(200).send();
        console.log(e);
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
});

app.post('/dialog-endpoint', (req, res) => {
    console.log(req.body); // Handle dialog submission data here
    res.status(200).send('Dialog submission received');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
