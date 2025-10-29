// Middlewares/validation.middleware.js
import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "../Utils/ApiError.js";

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        throw new ApiError(400, "Validation failed", errorMessages);
    }
    next();
};

// Team creation validation
const validateTeamCreation = [
    body('teamName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Team name must be between 1 and 100 characters'),
    body('caseName')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Case name must be between 1 and 200 characters'),
    body('caseType')
        .isIn(['Civil', 'Criminal', 'Corporate', 'Tax', 'Family', 'Environmental', 'Intellectual Property'])
        .withMessage('Invalid case type'),
    body('moreInfo')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Additional info must not exceed 1000 characters'),
    handleValidationErrors
];

// Team invitation validation
const validateTeamInvitation = [
    body('teamId')
        .isMongoId()
        .withMessage('Invalid team ID'),
    body('receiverId')
        .isMongoId()
        .withMessage('Invalid receiver ID'),
    body('message')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Message must not exceed 500 characters'),
    handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (field) => [
    param(field)
        .isMongoId()
        .withMessage(`Invalid ${field}`),
    handleValidationErrors
];

// Search validation
const validateSearch = [
    query('query')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),
    query('specialization')
        .optional()
        .isIn(['all', 'Criminal', 'Corporate', 'Civil', 'Tax', 'Family', 'Environmental', 'Intellectual Property'])
        .withMessage('Invalid specialization'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    handleValidationErrors
];

export {
    validateTeamCreation,
    validateTeamInvitation,
    validateObjectId,
    validateSearch,
    handleValidationErrors
};