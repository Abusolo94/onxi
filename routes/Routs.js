 const express = require("express")
 const {verifyPayment, checkSubscription, AddSubcription}  = require('../controllers/Controllers')

 router = express.Router()

  router.get("/verify/:reference", verifyPayment)
  router.post("/subscribe", AddSubcription )


 module.exports = router