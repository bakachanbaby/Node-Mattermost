// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const DIALOG_URL = `${process.env.URL_MATTERMOST}/api/v4/actions/dialogs/open`;
const MATTERMOST_ACCESS = process.env.MATTERMOST_ACCESS_TOKEN;
const NGROK_URL = process.env.URL_NGROK;
const POST_URL = `${process.env.URL_MATTERMOST}/api/v4/posts`;


app.get('/', (req, res) => {
    res.send('Hello World');
});

// app.post('/bot-command', async (req, res) => {
//     console.log(req.body);
//     const { channel_id, text } = req.body;

//     if (text === 'hi bot') {
//         await sendMessage(channel_id, "Hi");
//     }

//     res.json({ status: "ok" });
// });

// async function sendMessage(channelId, message) {
//     try {
//         const response = await axios.post(
//             `${process.env.URL_MATTERMOST}/api/v4/posts`,
//             {
//                 channel_id: channelId,
//                 message: message,
//             },
//             {
//                 headers: {
//                     'Authorization': `Bearer ${process.env.BOT_TOKEN}`,
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );
//         console.log('Message sent: ', response.data);
//     } catch (error) {
//         console.error('Error sending message: ', error.response ? error.response.data : error.message);
//     }
// }

app.post('/slash-command', (req, res) => {
    console.log(req.body);
    const response_url = req.body.response_url;
    const trigger_id = req.body.trigger_id;
    const channel_id = req.body.channel_id;

    console.log(response_url, trigger_id, channel_id);

    const dialog = {
        trigger_id: trigger_id,
        url: `${NGROK_URL}/initial-dialog-handler`,
        dialog: {
            callback_id: 'somecallbackid',
            title: 'Mẫu Dialog',
            elements: [
                {
                    "display_name": "Option Selector",
                    "name": "options",
                    "type": "select",
                    "options": [
                        {
                            "text": "Option1",
                            "value": "opt1"
                        },
                        {
                            "text": "Option2",
                            "value": "opt2"
                        },
                        {
                            "text": "Option3",
                            "value": "opt3"
                        },
                    ]
                },
            ],
            submit_label: 'Submit',
            notify_on_cancel: true,
            state: JSON.stringify({ response_url, channel_id, trigger_id})
        }
    };

    console.log(dialog);

    axios.post(DIALOG_URL, dialog, {
        headers: {
            'Authorization': `Bearer ${MATTERMOST_ACCESS}`,
            'Content-Type': 'application/json',
        }
    })
        .then((e) => {
            res.status(200).send();
            console.log(e.data);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
});

// Initial dialog handler to post slash command
app.post('/initial-dialog-handler', (req, res) => {
    const selectedOption = req.body.submission.options;
    const state = JSON.parse(req.body.state);
    const response_url = state.response_url;
    const channel_id = state.channel_id;

    console.log(state.trigger_id);

    // Generate a dynamic ID for demonstration purposes
    const dynamicId = 'id1';

    const command = `/command`;

    const post = {
        response_type: 'in_channel',
        text: command,
    };

    axios.post(response_url, post)
    .then(response => {
        res.status(200).json({
            errors: [],
            status_message: 'Thank you for your feedback!'
        });
    })
    .catch(error => {
        console.error(error);
        res.status(500).send('Internal Server Error');
    });

});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
