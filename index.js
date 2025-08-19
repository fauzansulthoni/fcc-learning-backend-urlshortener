require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
// Accessing mongoose
const mongoose = require("mongoose");
// Accessing dns module;
// const dns = require("dns");
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

// mongodb-connection
mongoose.connect(process.env.MONGODB_URI, { dbName: "fcc_urlshorteners" });

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Schema
const urlShortenerSchema = new mongoose.Schema({
  url: { type: String, rquired: true },
  short_url: Number,
});

const UrlShortener = mongoose.model("UrlShortener", urlShortenerSchema);

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:shorturl", async function (req, res) {
  const shorturl = req.params.shorturl;
  try {
    let data = await UrlShortener.findOne({ short_url: shorturl });
    res.redirect(data.url);
  } catch (error) {
    res.json({ error: "error redirecting to the original link" });
  }
});

// app.post("/api/shorturl", async function (req, res) {
//   const url = req.body.url;
//   const options = {
//     all: true,
//   };

  
//   const domain = url.match(/^(https?:\/\/)?([^\/\s]+)/)[2];
//   dns.lookup(domain, options, (error, addresses) => {
//     if (error) return res.json({ error: "invalid url", error });
//     console.log("dns_status: The website is on the list");
//   });

//   try {
//     // Check if the data is exist on the database
//     const existingRecord = await UrlShortener.findOne({ url: url });
//     if (existingRecord) {
//       return res.json({
//         original_url: existingRecord.url,
//         short_url: existingRecord.short_url,
//       });

//     }
//     const cleanUrl = url.match(/^(https?:\/\/[^\/\s]+)/)[1];
//     // Add new url shortener
//     const newRecord = await UrlShortener({
//       url: cleanUrl,
//       short_url: Number(Date.now().toString().slice(-5)),
//     });
//     newRecord.save().then((data) => {
//       console.log("Success adding the new data!");
//       res.json({
//         original_url: data.url,
//         short_url: data.short_url,
//       });

//     });
//   } catch (error) {
//     console.log("error: Error when adding data:", error);
//   }
// });

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  try {
    // 1. Validate protocol
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    // 2. DNS lookup
    const domain = parsedUrl.hostname;
    await lookup(domain);

    // 3. Check DB
    const existing = await UrlShortener.findOne({ url });
    if (existing) {
      return res.json({
        original_url: existing.url,
        short_url: existing.short_url,
      });
    }

    // 4. Save new record
    const shortCode = Number(Date.now().toString().slice(-5));
    const newRecord = new UrlShortener({
      url: parsedUrl.href,
      short_url: shortCode,
    });

    const saved = await newRecord.save();
    return res.json({
      original_url: saved.url,
      short_url: saved.short_url,
    });

  } catch (err) {
    console.error("Error:", err.message);
    return res.json({ error: 'invalid url' });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
