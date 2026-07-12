import express from "express";

const router = express.Router();

// Fleet Manager Dashboard
router.get("/", (req, res) => {
    res.render("fleet");
});

export default router;