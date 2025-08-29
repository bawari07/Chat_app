import axios from 'axios';
import FormData from 'form-data';

// Airtel SMS configuration
const airtelSMSConfig = {
    baseURL: process.env.AIRTEL_SMS_BASE_URL ,
    authUsername: process.env.AIRTEL_AUTH_USERNAME,
    authPassword: process.env.AIRTEL_AUTH_PASSWORD,
    customerId: process.env.AIRTEL_CUSTOMER_ID,
    sourceAddress: process.env.AIRTEL_SOURCE_ADDRESS,
    messageType: process.env.AIRTEL_MESSAGE_TYPE ,
    entityId: process.env.AIRTEL_ENTITY_ID,
    dltTemplateId: process.env.AIRTEL_DLT_TEMPLATE_ID
};

// Send SMS via Airtel SMS API
export const sendSMS = async (phoneNumber, message, otp) => {
    try {
        let url = airtelSMSConfig.baseURL + '/api/v1/send-sms';
        let basicAuth = Buffer.from(`${airtelSMSConfig.authUsername}:${airtelSMSConfig.authPassword}`).toString('base64');
        let requestBody = new FormData();
        requestBody.append('customerId', airtelSMSConfig.customerId);
        requestBody.append('destinationAddress', phoneNumber);
        requestBody.append('sourceAddress', airtelSMSConfig.sourceAddress);
        requestBody.append('messageType', airtelSMSConfig.messageType);
        requestBody.append('entityId', airtelSMSConfig.entityId);
        requestBody.append('message', message);
        requestBody.append('dltTemplateId', airtelSMSConfig.dltTemplateId);
        requestBody.append('otp', otp);

        let response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            }
        });
        return response.data;
    } catch (err) {
        console.error(`AIRTEL SMS DEBUG: ${err.response ? JSON.stringify(err.response.data) : err.stack}`);
        throw new Error('Failed to send SMS');
    }
};
