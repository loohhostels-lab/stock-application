import express from "express";
import jwt from "jsonwebtoken";


import { db, adminCredentialsTable, insertAdminSchema} from "db";

const app = express();
app.use(express.json());


app.get("/health", (req, res) => {
    res.json({message: "server is working fine"})
});


app.post("/login", async(req, res) => {
    const result = insertAdminSchema.safeParse(req.body);

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
    const {password, username} = result.data;
    console.log("value from client side", "username", username, "Password", password)

    //check username and password does exist in table ? 
    const isAccountExist = await db.query.adminCredentialsTable.findFirst({
        where: { username, password }
    });

    if(!isAccountExist) {
        return res.json({
            success: false,
            error: "Account does not exist"
        });
    }

    // if account exist then we sign a token and generate
    const token = jwt.sign(
        { id: isAccountExist.id, username: isAccountExist.username, role: isAccountExist.role },
        process.env.JWT_SECRET || "super-secret-key-12345",
        { expiresIn: "30d" }
    );

    return res.json({
        success: true,
        message: "Login successful",
        token,
    });
})


app.listen("8080", () => {
    console.log("server is working on port 8080")
})