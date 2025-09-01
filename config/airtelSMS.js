import dotenv from "dotenv";
dotenv.config();
export const airtelSMSConfig = {
  baseURL: process.env.AIRTEL_SMS_BASE_URL ,
  authUsername: process.env.AIRTEL_SMS_AUTH_USERNAME,
  authPassword: process.env.AIRTEL_SMS_AUTH_PASSWORD,
  customerId: process.env.AIRTEL_SMS_CUSTOMER_ID,
  sourceAddress: process.env.AIRTEL_SMS_SOURCE_ADDRESS,
  messageType: process.env.AIRTEL_SMS_MESSAGE_TYPE,
  entityId: process.env.AIRTEL_SMS_ENTITY_ID,
  dltTemplateId: process.env.AIRTEL_SMS_DLT_TEMPL_ID
};