import express from 'express';
import IotController from '../controllers/iot.controller.js';
import { verifyDeviceSignature } from '../middlewares/verifyDeviceSignature.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { schemas } from '../core/validation.schemas.js';

const router = express.Router();

router.post('/register', validateRequest(schemas.iotRegister), IotController.registerDevice);
router.post('/devices/register', validateRequest(schemas.iotRegister), IotController.registerDevice);

router.use(verifyDeviceSignature);

router.post('/devices/activate', IotController.activateDevice);
router.post('/devices/heartbeat', validateRequest(schemas.iotHeartbeat), IotController.reportHeartbeat);
router.post('/payments/report', validateRequest(schemas.iotPaymentReport), IotController.reportPayment);

export default router;
