// controllers/filterController.js
const db = require('../db');
const moment = require('moment');

const filterEntryFlow = async (req, res) => {
    try {
        const {
            user_id,
            dateFilter,
            CustomDate,
            startDate,
            endDate,
            entryType,
            party,
            reference,
            category,
            subCategory,
            headAccount,
            paymentMode,
            grade,
            customField,
            Field
        } = req.query;

        console.log('Received query parameters:', req.query);

        if (!user_id) {
            return res.status(400).json({ message: "user_id is required" });
        }

        if (Field) {
            return handleFieldOptions(req, res);
        }

        const lowerEntryType = entryType?.toLowerCase();
        if (!lowerEntryType) {
            return res.status(400).json({ message: "entryType is required for entry filtering" });
        }

        let query, table;

        switch (lowerEntryType) {
            case 'receipt':
                table = 'receipt_entries';
                break;
            case 'transfer':
                table = 'transfers';
                break;
            case 'payment':
                table = 'payment_entries';
                break;
            default:
                return res.status(400).json({ message: "Invalid entry type. Must be receipt, payment, or transfer" });
        }

        query = `SELECT * FROM ${table} WHERE user_id = ?`;
        let params = [user_id];

        // Date Filter
        if (dateFilter && dateFilter !== 'All') {
            const normalizedDateFilter = dateFilter.replace(/\s+/g, '').toLowerCase();
            switch (normalizedDateFilter) {
                case 'customdate':
                    if (!CustomDate) {
                        return res.status(400).json({ message: "CustomDate is required for CustomDate filter" });
                    }
                    const filterDate = moment(CustomDate, 'YYYY-MM-DD', true);
                    if (!filterDate.isValid()) {
                        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
                    }
                    query += ` AND DATE(created_at) = ?`;
                    params.push(filterDate.format('YYYY-MM-DD'));
                    break;

                case 'customperiod':
                    if (!startDate || !endDate) {
                        return res.status(400).json({ message: "startDate and endDate are required for CustomPeriod filter" });
                    }
                    const start = moment(startDate, 'YYYY-MM-DD', true);
                    const end = moment(endDate, 'YYYY-MM-DD', true);
                    if (!start.isValid() || !end.isValid()) {
                        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
                    }
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                    break;

                case 'currentmonth':
                    query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE) AND MONTH(created_at) = MONTH(CURRENT_DATE)`;
                    break;

                case 'lastmonth':
                    query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
                              AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`;
                    break;

                case 'currentfinancialyear':
                    const currentYear = moment().year();
                    const currentMonth = moment().month() + 1;
                    const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear-1}-04-01`;
                    const fyEnd = currentMonth >= 4 ? `${currentYear+1}-03-31` : `${currentYear}-03-31`;
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(fyStart, fyEnd);
                    break;

                case 'lastfinancialyear':
                    const lastFyYear = moment().year();
                    const lastFyMonth = moment().month() + 1;
                    const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear-1}-04-01` : `${lastFyYear-2}-04-01`;
                    const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear-1}-03-31`;
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(lastFyStart, lastFyEnd);
                    break;

                default:
                    return res.status(400).json({ message: "Invalid date filter" });
            }
        }

        // Party Filter
        if (party && party !== 'All') {
            query += ` AND party_id IN (?)`;
            params.push(party.split(','));
        }

        // Reference Filter
        if (reference) {
            query += ` AND reference = ?`;
            params.push(reference);
        }

        // Category Filter
        if (category && category !== 'All') {
            query += ` AND category_id IN (?)`;
            params.push(category.split(','));
        }

        // SubCategory Filter
        if (subCategory && subCategory !== 'All') {
            query += ` AND sub_category_id IN (?)`;
            params.push(subCategory.split(','));
        }

        // Head Account Filter
        if (headAccount && headAccount !== 'All') {
            query += ` AND head_account_id IN (?)`;
            params.push(headAccount.split(','));
        }

        // Payment Mode Filter
        if (paymentMode && paymentMode !== 'All') {
            query += ` AND payment_mode IN (?)`;
            params.push(paymentMode.split(','));
        }

        // Grade Filter
        if (grade && grade !== 'All') {
            query += ` AND grade IN (?)`;
            params.push(grade.split(','));
        }

        // Custom Field Filter
        if (customField && customField !== 'All') {
            query += ` AND custom_field_id IN (?)`;
            params.push(customField.split(','));
        }

        query += ` ORDER BY created_at DESC`;

        console.log('Executing query:', query);
        console.log('With parameters:', params);

        const [results] = await db.query(query, params);

        res.json({
            success: true,
            count: results.length,
            entries: results
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

async function handleFieldOptions(req, res) {
    const { user_id, entryType, dateFilter, CustomDate, startDate, endDate, Field } = req.query;

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    if (!Field) {
        return res.status(400).json({ message: "Field parameter is required" });
    }

    let table = 'receipt_entries';
    if (entryType) {
        const lowerEntryType = entryType.toLowerCase();
        switch (lowerEntryType) {
            case 'receipt': table = 'receipt_entries'; break;
            case 'payment': table = 'payment_entries'; break;
            case 'transfer': table = 'transfers'; break;
            default:
                return res.status(400).json({ message: "Invalid entryType. Must be receipt, payment, or transfer" });
        }
    }

    const buildDateCondition = (alias = '') => {
        if (!dateFilter || dateFilter === 'All') return { condition: '', params: [] };

        const normalizedDateFilter = dateFilter.replace(/\s+/g, '').toLowerCase();
        const dateParams = [];
        
        switch (normalizedDateFilter) {
            case 'customdate':
                if (!CustomDate) {
                    throw new Error("CustomDate is required");
                }
                const filterDate = moment(CustomDate, 'YYYY-MM-DD', true);
                if (!filterDate.isValid()) {
                    throw new Error("Invalid date format. Use YYYY-MM-DD");
                }
                dateParams.push(filterDate.format('YYYY-MM-DD'));
                return { 
                    condition: ` AND DATE(${alias ? alias + '.' : ''}created_at) = ?`,
                    params: dateParams
                };

            case 'customperiod':
                if (!startDate || !endDate) {
                    throw new Error("startDate and endDate are required");
                }
                const start = moment(startDate, 'YYYY-MM-DD', true);
                const end = moment(endDate, 'YYYY-MM-DD', true);
                if (!start.isValid() || !end.isValid()) {
                    throw new Error("Invalid date format. Use YYYY-MM-DD");
                }
                dateParams.push(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                return { 
                    condition: ` AND DATE(${alias ? alias + '.' : ''}created_at) BETWEEN ? AND ?`,
                    params: dateParams
                };

            case 'currentmonth':
                return { 
                    condition: ` AND YEAR(${alias ? alias + '.' : ''}created_at) = YEAR(CURRENT_DATE) 
                                AND MONTH(${alias ? alias + '.' : ''}created_at) = MONTH(CURRENT_DATE)`,
                    params: []
                };

            case 'lastmonth':
                return { 
                    condition: ` AND YEAR(${alias ? alias + '.' : ''}created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
                                AND MONTH(${alias ? alias + '.' : ''}created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`,
                    params: []
                };

            case 'currentfinancialyear':
                const currentYear = moment().year();
                const currentMonth = moment().month() + 1;
                const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear-1}-04-01`;
                const fyEnd = currentMonth >= 4 ? `${currentYear+1}-03-31` : `${currentYear}-03-31`;
                dateParams.push(fyStart, fyEnd);
                return { 
                    condition: ` AND DATE(${alias ? alias + '.' : ''}created_at) BETWEEN ? AND ?`,
                    params: dateParams
                };

            case 'lastfinancialyear':
                const lastFyYear = moment().year();
                const lastFyMonth = moment().month() + 1;
                const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear-1}-04-01` : `${lastFyYear-2}-04-01`;
                const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear-1}-03-31`;
                dateParams.push(lastFyStart, lastFyEnd);
                return { 
                    condition: ` AND DATE(${alias ? alias + '.' : ''}created_at) BETWEEN ? AND ?`,
                    params: dateParams
                };

            default:
                throw new Error("Invalid date filter");
        }
    };

    try {
        const fields = Field.split(',').map(f => f.trim().toLowerCase());
        const fieldResults = [];

        for (const field of fields) {
            let fieldQuery = '';
            let queryParams = [user_id];
            let dateCondition = { condition: '', params: [] };

            switch (field) {
                case 'party':
                    dateCondition = buildDateCondition('t');
                    fieldQuery = `
                        SELECT DISTINCT p.id, p.party AS name 
                        FROM parties p
                        LEFT JOIN ${table} t ON p.id = t.party_id AND t.user_id = p.user_id
                        WHERE p.user_id = ?
                        ${dateCondition.condition}
                        ORDER BY p.party ASC
                    `;
                    queryParams = queryParams.concat(dateCondition.params);
                    break;

                case 'category':
                    dateCondition = buildDateCondition('t');
                    fieldQuery = `
                        SELECT DISTINCT c.id, c.category_name AS name 
                        FROM categories c
                        LEFT JOIN ${table} t ON c.id = t.category_id AND t.user_id = c.user_id
                        WHERE c.user_id = ?
                        ${dateCondition.condition}
                        ORDER BY c.category_name ASC
                    `;
                    queryParams = queryParams.concat(dateCondition.params);
                    break;

                case 'group category':
                    fieldQuery = `
                        SELECT DISTINCT cg.id, cg.group_name AS name 
                        FROM category_groups cg
                        WHERE cg.user_id = ?
                        ORDER BY cg.group_name ASC
                    `;
                    break;

                case 'head account':
                    fieldQuery = `
                        SELECT DISTINCT ha.id, ha.name AS name 
                        FROM head_accounts ha
                        WHERE ha.user_id = ?
                        ORDER BY ha.name ASC
                    `;
                    break;

                case 'payment mode':
                    dateCondition = buildDateCondition();
                    fieldQuery = `
                        SELECT DISTINCT payment_mode AS name 
                        FROM ${table} 
                        WHERE user_id = ? 
                        AND payment_mode IS NOT NULL
                        AND payment_mode != ''
                        ${dateCondition.condition}
                        ORDER BY payment_mode ASC
                    `;
                    queryParams = queryParams.concat(dateCondition.params);
                    break;

                case 'grade':
                    dateCondition = buildDateCondition('t');
                    fieldQuery = `
                        SELECT DISTINCT p.grade AS name, p.id AS id 
                        FROM receipt_entries t
                        JOIN parties p ON t.party_id = p.id AND t.user_id = p.user_id
                        WHERE t.user_id = ?
                        AND p.grade IS NOT NULL AND p.grade != ''
                        ${dateCondition.condition}
                        ORDER BY p.grade ASC
                    `;
                    queryParams = queryParams.concat(dateCondition.params);
                    break;

                case 'custom field':
                    fieldQuery = `
                        SELECT id, field_name AS name 
                        FROM customer_fields
                        WHERE user_id = ?
                    `;
                    if (req.query.book_id) {
                        fieldQuery += ` AND book_id = ?`;
                        queryParams.push(req.query.book_id);
                    }
                    fieldQuery += ` ORDER BY field_name ASC`;
                    break;

                case 'referencer':
                    dateCondition = buildDateCondition('r');
                    fieldQuery = `
                        SELECT DISTINCT r.id, r.referencer AS name 
                        FROM book_referencers r
                        WHERE r.user_id = ?
                        ${dateCondition.condition}
                        ORDER BY r.referencer ASC
                    `;
                    queryParams = queryParams.concat(dateCondition.params);
                    break;

                default:
                    return res.status(400).json({ message: "Invalid Field parameter" });
            }

            console.log('Field query:', fieldQuery);
            console.log('Field params:', queryParams);

            const [results] = await db.query(fieldQuery, queryParams);
            fieldResults.push({ field: field, options: results });
        }

        return res.json({
            success: true,
            fields: fieldResults
        });

    } catch (error) {
        console.error('Error in handleFieldOptions:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

module.exports = { filterEntryFlow };