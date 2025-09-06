"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
// Trust proxy for rate limiting
app.set('trust proxy', 1);
let prisma = null;
let dbConnected = false;
// Try to connect to database
async function initializeDatabase() {
    try {
        prisma = new client_1.PrismaClient();
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        dbConnected = true;
    }
    catch (error) {
        console.log('⚠️ Database connection failed - using fallback data');
        console.log('Database error:', error);
        dbConnected = false;
        prisma = null;
    }
}
const PORT = parseInt(process.env.PORT || '3001');
// Professional rate limiting configuration
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 200, // Allow 200 requests per minute for better UX
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: 60
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful responses to allow normal operations
    skipSuccessfulRequests: true,
    // Different limits for different endpoints
    skip: (req) => {
        // Skip rate limiting for health checks and static content
        return req.path === '/api/health';
    }
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5000',
        'https://50ca67e3-1000-487b-b58d-3776daffa77d-00-1w4fx8ozjqedp.picard.replit.dev',
        process.env.FRONTEND_URL || 'http://localhost:5000'
    ],
    credentials: true
}));
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Make Prisma and DB status available to routes
app.use((req, res, next) => {
    req.prisma = prisma;
    req.dbConnected = dbConnected;
    next();
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Initialize database before starting server
initializeDatabase().then(() => {
    const server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`🚀 Backend server running on http://127.0.0.1:${PORT}`);
        console.log(`📊 Health check available at http://127.0.0.1:${PORT}/api/health`);
        console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Using fallback data'}`);
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(async () => {
            console.log('HTTP server closed');
            if (prisma)
                await prisma.$disconnect();
            process.exit(0);
        });
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map