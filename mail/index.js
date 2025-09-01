import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { airtelSMSConfig } from "../config/airtelSMS.js";

dotenv.config();

export const sendSMS = (details) => {
  return new Promise(async (resolve, reject) => {
    try {
      let url = airtelSMSConfig.baseURL + '/api/v1/send-sms';
      let basicAuth = Buffer.from(`${airtelSMSConfig.authUsername}:${airtelSMSConfig.authPassword}`).toString('base64');
      
      let requestBody = new FormData();
      requestBody.append('customerId', airtelSMSConfig.customerId);
      requestBody.append('destinationAddress', details.to);
      requestBody.append('sourceAddress', airtelSMSConfig.sourceAddress);
      requestBody.append('messageType', airtelSMSConfig.messageType);
      requestBody.append('entityId', airtelSMSConfig.entityId);
      requestBody.append('message', details.text);
      requestBody.append('dltTemplateId', airtelSMSConfig.dltTemplateId);
      
      if (details.otp) {
        requestBody.append('otp', details.otp);
      }

      let response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        }
      });

      resolve(response.data);
    } catch (err) {
      reject({
        status: 500,
        message: "SMS Send Failed"
      });
    }
  });
};
