require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sunRouter = require("./routes/Routs");

const app = express();

// app.use(cors({ origin: "*" }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://onxi-48735.web.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json()); // move express.json() here globally

// Mount the router
app.use("/onxi/payments", sunRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
