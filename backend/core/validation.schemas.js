import Joi from 'joi';

export const schemas = {
    authRegister: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            role: Joi.string().valid(
                'admin', 'manager', 'waqtek_team', 'user', 'client',
                'ADMIN', 'MANAGER', 'WAQTEK_TEAM', 'USER', 'CLIENT'
            ).optional()
        })
    },
    authRoleRegister: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            full_name: Joi.string().min(2).required()
        })
    },
    authManagerRoleRegister: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            full_name: Joi.string().min(2).required(),
            establishment_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
        })
    },
    authLogin: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required()
        })
    },
    establishmentCreate: {
        body: Joi.object({
            name: Joi.string().min(2).required(),
            address: Joi.string().allow('', null).optional()
        })
    },
    establishmentUpdate: {
        body: Joi.object({
            name: Joi.string().min(2).optional(),
            address: Joi.string().allow('', null).optional()
        }).min(1)
    },
    queueCreate: {
        body: Joi.object({
            establishmentid: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            name: Joi.string().min(1).required(),
            type: Joi.string().allow('', null).optional(),
            description: Joi.string().allow('', null).optional()
        })
    },
    managerContextSave: {
        body: Joi.object({
            queueId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            counter: Joi.number().integer().min(1).required()
        })
    },
    ticketCreate: {
        body: Joi.object({
            queueId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            clientId: Joi.string().optional()
        })
    },
    ticketPosCreate: {
        body: Joi.object({
            queueId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            remoteAccess: Joi.boolean().optional(),
            withRemoteAccess: Joi.boolean().optional(),
            vip: Joi.boolean().optional(),
            device_id: Joi.string().optional(),
            deviceId: Joi.string().optional(),
            id_device: Joi.string().optional()
        })
    },
    ticketStatusUpdate: {
        params: Joi.object({
            id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
        }),
        body: Joi.object({
            status: Joi.string().required(),
            counter: Joi.alternatives().try(Joi.string(), Joi.number()).optional()
        })
    },
    iotRegister: {
        body: Joi.object({
            establishment_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            device_id: Joi.string().min(3).optional()
        })
    },
    iotPaymentReport: {
        body: Joi.object({
            transaction_id: Joi.string().required(),
            ticket_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
            amount: Joi.number().required(),
            status: Joi.string().required()
        })
    },
    iotHeartbeat: {
        body: Joi.object({
            uptime_ms: Joi.number().integer().min(0).required(),
            fw_version: Joi.string().min(1).required(),
            free_heap: Joi.number().integer().min(0).optional(),
            status: Joi.string().valid('OK', 'WARN', 'ERROR').default('OK'),
            ip: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).optional()
        })
    },
    videoCreate: {
        body: Joi.object({
            establishment_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
            establishmentId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
            nom: Joi.string().min(1).required(),
            lien: Joi.string().uri().required()
        }).or('establishment_id', 'establishmentId')
    },
    statsRangeQuery: {
        query: Joi.object({
            start: Joi.string().isoDate().optional(),
            end: Joi.string().isoDate().optional(),
            establishment_id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
            establishmentId: Joi.alternatives().try(Joi.string(), Joi.number()).optional()
        })
    }
};
