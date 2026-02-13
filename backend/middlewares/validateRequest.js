import logger from '../core/logger.js';

function validatePart(partName, schema, req) {
    if (!schema) return null;

    const { error, value } = schema.validate(req[partName], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });

    if (error) return error;
    req[partName] = value;
    return null;
}

export function validateRequest(definition = {}) {
    return (req, res, next) => {
        const bodyError = validatePart('body', definition.body, req);
        const paramsError = validatePart('params', definition.params, req);
        const queryError = validatePart('query', definition.query, req);

        const error = bodyError || paramsError || queryError;
        if (error) {
            logger.warn('Validation failed', {
                path: req.originalUrl,
                details: error.details?.map((d) => d.message) || [error.message]
            });
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                details: error.details?.map((d) => d.message) || [error.message]
            });
        }

        return next();
    };
}
