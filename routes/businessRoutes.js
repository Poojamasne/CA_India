const express = require("express");
const {
    addBusiness,
    updateBusinessCategory,
    updateBusinessType,
    getBusinesses,
    getBusinessById,
    deleteBusiness
} = require("../controllers/businessController");
const verifyToken = require('../middleware/auth'); // Ensure the path is correct


const router = express.Router();

router.post("/business", verifyToken, addBusiness);
router.put("/business/:id/category", verifyToken, updateBusinessCategory);
router.put("/business/:id/type", verifyToken, updateBusinessType);
router.get("/businesses", verifyToken, getBusinesses);

router.get("/business/:id", verifyToken, getBusinessById);
router.delete("/business/:id", verifyToken, deleteBusiness);

module.exports = router;
