import type { Response } from "express";
import {DrizzleQueryError} from "db";

type MySqlErrorEntry = { status: number; message: string };

// mysql2 error shape: { code: string; errno: number; sqlState?: string; sqlMessage?: string }
type MySqlDriverError = Error & {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
};

const DEFAULT_MYSQL_ERRORS: Record<string, MySqlErrorEntry> = {
  ER_DUP_ENTRY: { status: 400, message: "Record already exists" },
  ER_NO_REFERENCED_ROW: { status: 400, message: "Referenced record not found" },
  ER_NO_REFERENCED_ROW_2: { status: 400, message: "Referenced record not found" },
  ER_ROW_IS_REFERENCED: { status: 400, message: "Record is referenced by other data" },
  ER_ROW_IS_REFERENCED_2: { status: 400, message: "Record is referenced by other data" },
  ER_BAD_NULL_ERROR: { status: 400, message: "Validation failed" },
  ER_CHECK_CONSTRAINT_VIOLATED: { status: 400, message: "Validation failed" },
  ER_DATA_TOO_LONG: { status: 400, message: "Validation failed" },
  ER_CON_COUNT_ERROR: { status: 503, message: "Service temporarily unavailable" },
  ER_LOCK_WAIT_TIMEOUT: { status: 503, message: "Service temporarily unavailable" },
  ER_BAD_FIELD_ERROR: {status: 400, message: "Validation failed"},
};

export function handleDrizzleError(
  error: unknown,
  res: Response,
  mysqlErrors: Record<string, MySqlErrorEntry> = DEFAULT_MYSQL_ERRORS
) {
    console.log("error coming from lib",error)
  if (error instanceof DrizzleQueryError) {
    const cause = error.cause as MySqlDriverError | undefined;
    const code = cause?.code;
    const entry = code ? { ...DEFAULT_MYSQL_ERRORS, ...mysqlErrors }[code] : undefined;
    if (entry) {
      return res.status(entry.status).json({ success: false, error: entry.message });
    }
  }
  return res.status(500).json({ success: false, error: "Internal server error", });
}

// // use defaults as-is
// } catch (error) {
//   return handleDrizzleError(error, res);
// }
// // or override just what you need
// } catch (error) {
//   return handleDrizzleError(error, res, {
//     ER_DUP_ENTRY: { status: 409, message: "User already exists" },
//   });
// }