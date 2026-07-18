import express from "express";
import authRouter from "./auth";
import branchRouter from "./branch";
import userRouter from "./user";
import productInfoRouter from "./product-information";
import categorySelectRouter from "./category-select";
import productRouter from "./product";

const router = express.Router();

// Auth routes (no prefix): /health, /login, /me
router.use("/", authRouter);

// Admin routes (all prefixed with /admin)
router.use("/admin", branchRouter);
router.use("/admin", productInfoRouter);
router.use("/admin", categorySelectRouter);
router.use("/admin", productRouter);

// User routes: /admin/create-user-branch, /get-all-user (mixed prefixes)
router.use("/", userRouter);

export default router;
