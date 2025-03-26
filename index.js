require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const dns = require('dns');

// Connect to mongodb
mongoose.connect(process.env.MONGO_URI)
        .then(() => {
          console.log('Connected to MongoDB');
        })
        .catch(err => {
          console.log('Error connecting to MongoDB:', err);
        });

// Create a url schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})
const Url = mongoose.model('Url', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// Middleware to parse URL-encoded data (for form submissions)
app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Shorten Url
app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body

  // Check if the URL already exists in the database
  let existingUrl = await Url.findOne({ original_url: url});

  if (existingUrl) {
    // If the URL already exists, return the existing short URL
    return res.json({
      original_url: existingUrl.original_url,
      short_url: existingUrl.short_url
    });
  }

  // Check if the URL is valid
  const validUrl = new URL(url);

    // Ensure the protocol is either http or https
    if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

  const hostname = validUrl.hostname; // Extract the domain name

  // Use a promise to handle DNS lookup
  dns.lookup(hostname, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'invalid url' }); // Invalid or unreachable domain
    }

    // If DNS lookup is successful, proceed to generate the short URL
    const count = await Url.countDocuments();
    const shortUrl = count + 1;

    // Save the URL
    const newUrl = new Url({
      original_url: url,
      short_url: shortUrl
    });

    await newUrl.save();

    // Send the response
    res.json({
      original_url: url,
      short_url: shortUrl
    });
  });
})

// GET endpoint for redirecting based on short URL
app.get('/api/shorturl/:short', async (req, res) => {
  const shortUrl = Number(req.params.short); // Ensure it's a number

  const url = await Url.findOne({ short_url: shortUrl });
  if (url) {
    res.redirect(url.original_url);
  } else {
    res.json({ error: 'Short URL not found' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});