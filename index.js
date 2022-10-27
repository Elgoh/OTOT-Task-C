const express = require("express");
const app = express();
const { auth, requiredScopes } = require("express-oauth2-jwt-bearer");
var connection = require("./database.js");
const Redis = require("redis");

const redisClient = Redis.createClient();
redisClient.connect().then((resp) => console.log("connected"));
const DEFAULT_EXPIRATION = 60;

// Authorization middleware. When used, the Access Token must
// exist and be verified against the Auth0 JSON Web Key Set.
const checkJwt = auth({
  audience: "https://ototbackend.com",
  issuerBaseURL: `https://elgoh.us.auth0.com/`,
});

const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions)); // Use this after the variable declaration

// This route doesn't need authentication
app.get("/api/public", function (req, res) {
  res.json({
    message:
      "Hello from a public endpoint! You don't need to be authenticated to see this.",
  });
});

// This route needs authentication
app.get("/api/private", checkJwt, function (req, res) {
  res.json({
    message:
      "Hello from a private endpoint! You need to be authenticated to see this.",
  });
});

const checkScopes = requiredScopes("read:message");

app.get("/api/private-scoped", checkJwt, checkScopes, function (req, res) {
  res.json({
    message:
      "Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.",
  });
});

app.get("/", async (req, res) => {
  console.log("get request");
  const authors = await redisClient.get("authors");
  if (authors != null) {
    console.log("cache hit");
    return res.json({
      message: JSON.parse(authors),
    });
  } else {
    console.log("cache miss");
    connection.query("SELECT * FROM authors", function (err, rows) {
      if (err) {
        res.json({
          message: "Failed to retrieve data",
        });
      } else {
        redisClient.setEx("authors", DEFAULT_EXPIRATION, JSON.stringify(rows));
        res.json({
          message: rows,
        });
      }
    });
  }
});

app.listen(8393, function () {
  console.log("Listening on http://localhost:8393");
});
