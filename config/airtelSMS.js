require('dotenv').config();
export const airtelSMSConfig = {
  baseURL: process.env.AIRTEL_SMS_BASE_URL ,
  authUsername: process.env.AIRTEL_AUTH_USERNAME,
  authPassword: process.env.AIRTEL_AUTH_PASSWORD,
  customerId: process.env.AIRTEL_CUSTOMER_ID,
  sourceAddress: process.env.AIRTEL_SOURCE_ADDRESS,
  messageType: process.env.AIRTEL_MESSAGE_TYPE || 'TEXT',
  entityId: process.env.AIRTEL_ENTITY_ID,
  dltTemplateId: process.env.AIRTEL_DLT_TEMPLATE_ID
};
