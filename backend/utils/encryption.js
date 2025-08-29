const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default32characterencryptionkey', 'utf8').slice(0, 32);
const iv = crypto.randomBytes(16);

// 데이터 암호화
const encrypt = (text) => {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
};

// 데이터 복호화
const decrypt = (encryptedText) => {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
};

// 민감 필드 암호화 처리
const encryptSensitiveFields = async (data, sensitiveFields) => {
  const encryptedData = { ...data };
  
  for (const field of sensitiveFields) {
    if (encryptedData[field]) {
      encryptedData[field] = encrypt(encryptedData[field].toString());
    }
  }
  
  return encryptedData;
};

// 민감 필드 복호화 처리
const decryptSensitiveFields = async (data, sensitiveFields) => {
  const decryptedData = { ...data };
  
  for (const field of sensitiveFields) {
    if (decryptedData[field]) {
      try {
        decryptedData[field] = decrypt(decryptedData[field]);
      } catch (error) {
        // 복호화 실패 시 원본 유지
        console.error(`Failed to decrypt field ${field}`);
      }
    }
  }
  
  return decryptedData;
};

module.exports = {
  encrypt,
  decrypt,
  encryptSensitiveFields,
  decryptSensitiveFields
};