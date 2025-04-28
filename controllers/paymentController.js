const db = require('../db');

// Function to generate a unique payment number
const generatePaymentNo = () => {
    return `PAY-${Date.now().toString().slice(-6)}`;
};

// 📌 Add a new payment entry (with user_id)
exports.addpaymentEntry = async (req, res) => {
    try {
        const {
            receipt_type,
            amount,
            party,
            remark,
            category_split,
            customer_field,
            payment_mode,
            selected_bank,
            user_id,
            book_id,
            status,
            custom_field_id
        } = req.body;

        // Validate required fields
        if (!receipt_type || !amount || !party || !payment_mode || !user_id || !book_id || !status) {
            return res.status(400).json({ 
                error: "Missing required fields",
                missing: {
                    receipt_type: !receipt_type,
                    amount: !amount,
                    party: !party,
                    payment_mode: !payment_mode,
                    user_id: !user_id,
                    book_id: !book_id,
                    status: !status
                }
            });
        }

        // Validate status value
        if (!['credit', 'debit'].includes(status.toLowerCase())) {
            return res.status(400).json({
                error: "Invalid status value. Must be 'credit' or 'debit'."
            });
        }

        // Stringify category_split if it exists
        const categoryJson = category_split ? JSON.stringify(category_split) : null;

        // Generate unique payment number
        const payment_no = generatePaymentNo();

        // SQL query to insert data into payment_entries table
        const sql = `INSERT INTO payment_entries 
            (payment_no, receipt_type, amount, party, remark, category_split, 
             customer_field, payment_mode, selected_bank, user_id, book_id, status, custom_field_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        // Insert the new payment entry into the database
        const [result] = await db.execute(sql, [
            payment_no, receipt_type, amount, party, remark, 
            categoryJson, customer_field, payment_mode, 
            selected_bank, user_id, book_id, status.toLowerCase(), custom_field_id || null
        ]);

        // Send success response with payment details
        res.json({
            success: true, 
            message: "Payment entry added successfully",
            payment_id: result.insertId,
            payment_no: payment_no,
            user_id: user_id,
            book_id: book_id,
            status: status.toLowerCase(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });

    } catch (error) {
        // Handle errors and send error response
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage || null
        });
    }
};



// 📌 Get all payment entries (filtered by user_id)
exports.getAllpayments = async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        const [results] = await db.execute(
            "SELECT * FROM payment_entries WHERE user_id = ? ORDER BY created_at DESC",
            [user_id]
        );

        res.json({ 
            payments: results,
            count: results.length,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// 📌 Delete a payment entry (with user verification)
exports.deletepaymentEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // Verify ownership before deletion
        const [verify] = await db.execute(
            "SELECT id FROM payment_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Payment entry not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const [result] = await db.execute(
            "DELETE FROM payment_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        res.json({ 
            message: "Payment entry deleted successfully",
            payment_id: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// 📌 Update a payment entry (with user verification)
exports.updatepaymentEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            receipt_type,
            amount,
            party,
            remark,
            category_split,
            customer_field,
            payment_mode,
            selected_bank,
            user_id  // Added user_id
        } = req.body;

        // Verify ownership before update
        const [verify] = await db.execute(
            "SELECT id FROM payment_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Payment entry not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const sql = `UPDATE payment_entries 
                     SET receipt_type = ?, amount = ?, party = ?, remark = ?, 
                         category_split = ?, customer_field = ?, payment_mode = ?, selected_bank = ?
                     WHERE id = ? AND user_id = ?`;

        const [result] = await db.execute(sql, [
            receipt_type, amount, party, remark, category_split, 
            customer_field, payment_mode, selected_bank, 
            id, user_id
        ]);

        res.json({
            success: true, 
            message: "Payment entry updated successfully",
            payment_id: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// 📌 Add a new payment mode (with user verification)
exports.addPaymentMode = async (req, res) => {
    const {
        payment_no,
        receipt_type,
        amount,
        party,
        remark,
        category_split,
        customer_field,
        payment_mode,
        selected_bank,
        book_id,
        user_id  // Added user_id
    } = req.body;

    try {
        // Verify book ownership
        const [bookVerify] = await db.execute(
            "SELECT book_id FROM books WHERE book_id = ? AND user_id = ?",
            [book_id, user_id]
        );

        if (bookVerify.length === 0) {
            return res.status(403).json({ 
                message: 'Book not found or not owned by user',
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        // Insert payment with user_id
        const insertQuery = `
            INSERT INTO payment_entries 
            (payment_no, receipt_type, amount, party, remark, category_split, 
             customer_field, payment_mode, selected_bank, user_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        const [insertResult] = await db.query(insertQuery, [
            payment_no, receipt_type, amount, party, remark, 
            category_split, customer_field, payment_mode, 
            selected_bank, user_id
        ]);

        res.status(201).json({
            success: true,
            message: 'Payment mode added successfully',
            payment_id: insertResult.insertId,
            user_id: user_id
        });
    } catch (error) {
        console.error('Error adding payment mode:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// 📌 Get payment modes for a book (with user verification)
exports.getPaymentModesByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId, 10);
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ 
            message: 'user_id is required',
            code: "USER_ID_REQUIRED"
        });
    }

    try {
        // Verify book ownership
        const [bookVerify] = await db.query(
            'SELECT party_id FROM books WHERE book_id = ? AND user_id = ?',
            [bookId, user_id]
        );

        if (bookVerify.length === 0) {
            return res.status(403).json({ 
                message: 'Book not found or not owned by user',
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const partyId = bookVerify[0].party_id;

        if (!partyId) {
            return res.json({ 
                message: 'No payment modes found for this book', 
                payments: [],
                user_id: user_id
            });
        }

        // Get party details
        const [partyResult] = await db.query(
            'SELECT party FROM parties WHERE id = ? AND user_id = ?',
            [partyId, user_id]
        );

        if (partyResult.length === 0) {
            return res.json({ 
                message: 'Party not found', 
                payments: [],
                user_id: user_id
            });
        }

        const partyName = partyResult[0].party;

        // Get payments for party
        const [paymentResults] = await db.query(
            'SELECT * FROM payment_entries WHERE TRIM(party) = TRIM(?) AND user_id = ?',
            [partyName, user_id]
        );

        res.json({ 
            payments: paymentResults,
            count: paymentResults.length,
            user_id: user_id
        });
    } catch (error) {
        console.error('Error fetching payment modes:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// 📌 Get book with linked payment modes (with user verification)
exports.getPaymentsByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ 
            message: 'user_id is required',
            code: "USER_ID_REQUIRED"
        });
    }

    try {
        // Verify book ownership
        const [bookResult] = await db.query(
            'SELECT * FROM books WHERE book_id = ? AND user_id = ?',
            [bookId, user_id]
        );

        if (!bookResult || bookResult.length === 0) {
            return res.status(403).json({ 
                message: 'Book not found or not owned by user',
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const book = bookResult[0];

        // Get payments for book
        const [paymentsResult] = await db.query(
            'SELECT * FROM payment_entries WHERE book_id = ? AND user_id = ?',
            [bookId, user_id]
        );

        if (!paymentsResult || paymentsResult.length === 0) {
            return res.json({ 
                message: 'No payments found for this book',
                book: book,
                payments: [],
                user_id: user_id
            });
        }

        // Convert buffer fields if needed
        const payments = paymentsResult.map(payment => ({
            ...payment,
            category_split: payment.category_split?.toString(),
            amount: payment.amount?.toString()
        }));

        res.json({
            book: book,
            payments: payments,
            count: payments.length,
            user_id: user_id
        });
    } catch (error) {
        console.error('Error fetching payments for book:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message
        });
    }
};
