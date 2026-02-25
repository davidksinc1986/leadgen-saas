import CryptoJS from "crypto-js";

const key = process.env.APP_CRYPTO_KEY || "dev_insecure_key_change_me";

export function encrypt(text: string) {
 if (!text) return "";
 return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(cipher: string) {
 if (!cipher) return "";
 const bytes = CryptoJS.AES.decrypt(cipher, key);
 return bytes.toString(CryptoJS.enc.Utf8);
}