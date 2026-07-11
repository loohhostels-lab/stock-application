import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { db, userTable, branchTable, loginSchema, insertUserSchema, insertBranchSchema } from "db";
import { eq, and, ne } from "drizzle-orm";
import { authMiddleware } from "./middleware/auth";
import { handleDrizzleError } from "./lib/db-error";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/health", (req, res) => {
    res.json({message: "server is working fine"})
});


app.post("/login", async(req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."), // which field failed
            type: issue.code,            // e.g. "invalid_type", "too_small", "invalid_string"
            message: issue.message,      // human-readable reason
        }));

        return res.status(400).json({
            message: "Invalid request",
            errors,
        });
    }

    const { email, password } = result.data;
    console.log("before email and password")

    try {
        // Check if account exists with matching email and password
        const [user] = await db
            .select()
            .from(userTable)
            .where(and(eq(userTable.email, email), eq(userTable.password, password)))
            .limit(1);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        // Sign JWT with user info
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token,
        });
    } catch (error: any) {
        console.error("Login route error:", error);
        if (error && typeof error === "object" && "cause" in error) {
            console.error("Login route error cause:", error.cause);
        }
        handleDrizzleError(error, res);
    }
});


// Protected route — example usage of auth middleware
app.get("/me", authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const [user] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, req.user.id))
            .limit(1);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const { password, ...userWithoutPassword } = user;

        return res.json({
            success: true,
            user: userWithoutPassword,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});


// ─── Branch Routes ───────────────────────────────────────────────

// Admin-only: create a new branch
app.post("/admin/create-branch", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can create branches",
        });
    }

    const result = insertBranchSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."),
            type: issue.code,
            message: issue.message,
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
    }

    try {
        await db.insert(branchTable).values(result.data);

        return res.status(201).json({
            success: true,
            message: "Branch created successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get all branches
app.get("/admin/get-all-branches", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view branches",
        });
    }

    try {
        const branches = await db
            .select()
            .from(branchTable)
            .where(ne(branchTable.id, "justdefaultbranchforadminTokeepdataconsistent"));
        return res.json({
            success: true,
            branches,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: edit a branch
app.put("/admin/edit-branch/:id", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can edit branches",
        });
    }

    const { id } = req.params;

    if (!id || typeof id !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid branch ID",
        });
    }

    const result = insertBranchSchema.partial().safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."),
            type: issue.code,
            message: issue.message,
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
    }

    try {
        const [existingBranch] = await db
            .select()
            .from(branchTable)
            .where(eq(branchTable.id, id))
            .limit(1);

        if (!existingBranch) {
            return res.status(404).json({
                success: false,
                error: "Branch not found",
            });
        }

        await db
            .update(branchTable)
            .set(result.data)
            .where(eq(branchTable.id, id));

        return res.json({
            success: true,
            message: "Branch updated successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

// Admin-only: get a single branch by ID
app.get("/admin/get-branch/:id", authMiddleware, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can view branches",
        });
    }

    const { id } = req.params;

    if (!id || typeof id !== "string") {
        return res.status(400).json({
            success: false,
            error: "Invalid branch ID",
        });
    }

    try {
        const [branch] = await db
            .select()
            .from(branchTable)
            .where(eq(branchTable.id, id))
            .limit(1);

        if (!branch) {
            return res.status(404).json({
                success: false,
                error: "Branch not found",
            });
        }

        return res.json({
            success: true,
            branch,
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});




// ─── User Routes ─────────────────────────────────────────────────

// Admin-only: create a new user
app.post("/admin/create-user-branch", authMiddleware, async (req, res) => {
    // Only admins can create users
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can create users",
        });
    }

    const result = insertUserSchema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."),
            type: issue.code,
            message: issue.message,
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
    }

    try {
        await db.insert(userTable).values(result.data);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
        });
    } catch (error: any) {
        handleDrizzleError(error, res);
    }
});

app.get("/get-all-user", authMiddleware, async (req, res) => {
    if(req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            error: "Forbidden: only admins can get all users",
        });
    }
    const users = await db
        .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            phone: userTable.phone,
            address: userTable.address,
            role: userTable.role,
            branch_id: userTable.branch_id,
            is_active: userTable.is_active,
            createdAt: userTable.createdAt,
            updatedAt: userTable.updatedAt,
            branch_title: branchTable.title,
            branch_address: branchTable.address,
        })
        .from(userTable)
        .leftJoin(branchTable, eq(userTable.branch_id, branchTable.id))
        .where(ne(userTable.role, "ADMIN"));

    return res.json({
        success: true,
        users,
    });
});

app.listen("8080", () => {
    console.log("server is working on port 8080")
})