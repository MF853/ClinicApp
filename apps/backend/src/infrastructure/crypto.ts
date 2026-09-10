import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
function key(){const k=Buffer.from(process.env.ATTACHMENT_KEY??'','hex');if(k.length!==32)throw new Error('ATTACHMENT_KEY must contain 32 bytes');return k;}
export function encrypt(data:Buffer){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(data),cipher.final()]);return Buffer.concat([iv,body,cipher.getAuthTag()]);}
export function decrypt(data:Buffer){const cipher=createDecipheriv('aes-256-gcm',key(),data.subarray(0,12));cipher.setAuthTag(data.subarray(-16));return Buffer.concat([cipher.update(data.subarray(12,-16)),cipher.final()]);}
