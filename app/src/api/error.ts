import type { ApiErrorCode, ApiErrorDetails } from './types';

// Port 1:1 từ js/api.js — luôn có .status (mã HTTP, 0 = lỗi mạng), .code,
// .message (tiếng Việt, hiển thị thẳng được), .details (VD { field: 'email' }).
export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details: ApiErrorDetails | null;

  constructor(status: number, code: ApiErrorCode, message: string, details: ApiErrorDetails | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Dữ liệu đã tồn tại hoặc xung đột với dữ liệu hiện có.'
};

const DEFAULT_CODES: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT'
};

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetails | null;
  };
}

// Response không đúng khuôn { error: {...} } (lỗi 500 trần, HTML báo lỗi của
// proxy/webserver...) → dùng thông báo mặc định theo mã HTTP thay vì hiện
// chuỗi rác cho người dùng.
export function buildApiError(status: number, body: ErrorBody | null): ApiError {
  if (body?.error?.message) {
    return new ApiError(
      status,
      body.error.code || DEFAULT_CODES[status] || 'INTERNAL_ERROR',
      body.error.message,
      body.error.details || null
    );
  }
  return new ApiError(
    status,
    DEFAULT_CODES[status] || 'INTERNAL_ERROR',
    DEFAULT_MESSAGES[status] || 'Lỗi máy chủ, vui lòng thử lại sau.',
    null
  );
}

export function networkError(): ApiError {
  return new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.', null);
}
