import msg91 from "msg91";

// MSG91 Response Types
interface MSG91SuccessResponse {
  type: "success";
  message: string;
  requestId?: string;
}

interface MSG91ErrorResponse {
  type: "error";
  message: string;
}

type MSG91Response = MSG91SuccessResponse | MSG91ErrorResponse;

interface MSG91Config {
  authKey: string;
}

// Extend Window interface to include MSG91 types
declare global {
  interface Window {
    initSendOTP: (config: MSG91Config) => void;
    sendOtp: (
      phone: string,
      success: (response: MSG91Response) => void,
      error: (error: Error) => void
    ) => void;
    retryOtp: (
      phone: string,
      success: (response: MSG91Response) => void,
      error: (error: Error) => void
    ) => void;
    verifyOtp: (
      otp: string,
      success: (response: MSG91Response) => void,
      error: (error: Error) => void,
      request_id: string
    ) => void;
  }
}

if (!process.env.NEXT_PUBLIC_MSG91_AUTH_KEY) {
  throw new Error("MSG91_AUTH_KEY is not set");
}

const otpTemplateId = process.env.NEXT_PUBLIC_MSG91_OTP_TEMPLATE_ID;

if (!otpTemplateId) {
  throw new Error("MSG91_OTP_TEMPLATE_ID is not set");
}

msg91.initialize({ authKey: process.env.NEXT_PUBLIC_MSG91_AUTH_KEY });

const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 15;
};

export const sendOTP = async (
  phone: string
): Promise<{
  success: boolean;
  data: MSG91Response | null;
  error: Error | null;
}> => {
  return new Promise((resolve) => {
    if (!validatePhoneNumber(phone)) {
      throw new Error("Invalid phone number");
    }

    phone = phone.replace("+", "");

    window.sendOtp(
      phone,
      (response: MSG91Response) => {
        resolve({
          success: true,
          data: response,
          error: null,
        });
      },
      (error: Error) => {
        resolve({
          success: false,
          data: null,
          error: error,
        });
      }
    );
  });
};

export const resendOTP = async (
  phone: string
): Promise<{
  success: boolean;
  data: MSG91Response | null;
  error: Error | null;
}> => {
  return new Promise((resolve) => {
    if (!validatePhoneNumber(phone)) {
      throw new Error("Invalid phone number");
    }

    if (!phone.startsWith("91")) {
      phone = `91${phone}`;
    }
    window.retryOtp(
      phone,
      (response: MSG91Response) => {
        resolve({ success: true, data: response, error: null });
      },
      (error: Error) => {
        resolve({ success: false, data: null, error: error });
      }
    );
  });
};

export const verifyOtp = async (
  reqId: string,
  otp: string
): Promise<{
  success: boolean;
  data: MSG91Response | null;
  error: Error | null;
}> => {
  return new Promise(async (resolve) => {
    if (!reqId || !otp) {
      resolve({
        success: false,
        data: null,
        error: new Error("Invalid request ID or OTP"),
      });
      return;
    }

    window.verifyOtp(
      otp,
      (response: MSG91Response) => {
        if (response.type === "error") {
          resolve({
            success: false,
            data: null,
            error: new Error(response.message),
          });
        } else if (response.type === "success") {
          resolve({ success: true, data: response, error: null });
        }
      },
      (error: Error) => {
        resolve({ success: false, data: null, error: error });
      },
      reqId
    );
  });
};
