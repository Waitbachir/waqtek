import Device from '../models/device.model.js';
import {
    isTimestampFresh,
    signIotBody,
    signIotRequest,
    verifyIotSignature
} from '../core/crypto.util.js';

const TIMESTAMP_TOLERANCE_MS = Number(process.env.IOT_SIGNATURE_TOLERANCE_MS || 5 * 60 * 1000);

export async function verifyDeviceSignature(req, res, next) {
    try {
        const deviceId = String(req.headers['x-device-id'] || '').trim();
        const timestamp = String(req.headers['x-signature-timestamp'] || '').trim();
        const signature = String(req.headers['x-signature'] || '').trim();

        if (!deviceId || !signature) {
            return res.status(401).json({
                error: 'UNSIGNED_REQUEST',
                message: 'x-device-id et x-signature sont obligatoires'
            });
        }

        const device = await Device.findByDeviceId(deviceId);
        if (!device) {
            return res.status(401).json({
                error: 'DEVICE_UNKNOWN',
                message: 'Appareil inconnu'
            });
        }

        const status = String(device.status || (device.active ? 'ACTIVE' : 'DISABLED')).toUpperCase();
        if (status !== 'ACTIVE') {
            return res.status(403).json({
                error: 'DEVICE_DISABLED',
                message: 'Appareil desactive'
            });
        }

        let expected = signIotBody({
            body: req.body,
            secretKey: device.secret_key
        });

        // Backward compatibility with old payload format using timestamp.
        if (timestamp) {
            if (!isTimestampFresh(timestamp, TIMESTAMP_TOLERANCE_MS)) {
                return res.status(401).json({
                    error: 'SIGNATURE_EXPIRED',
                    message: 'Signature expiree ou horloge invalide'
                });
            }

            expected = signIotRequest({
                deviceId,
                timestamp,
                method: req.method,
                path: req.originalUrl.split('?')[0],
                body: req.body,
                secretKey: device.secret_key
            });
        }

        if (!verifyIotSignature({ providedSignature: signature, expectedSignature: expected })) {
            return res.status(401).json({
                error: 'INVALID_SIGNATURE',
                message: 'Signature HMAC invalide'
            });
        }

        await Device.touchLastSeen(deviceId);
        req.device = device;
        return next();
    } catch (error) {
        return res.status(500).json({
            error: 'SIGNATURE_VERIFICATION_ERROR',
            message: error.message || 'Erreur de verification de signature'
        });
    }
}
