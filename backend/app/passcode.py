from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import get_settings

PASSCODE_HEADER = "x-app-passcode"


class PasscodeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        passcode = get_settings().app_passcode
        if not passcode or request.method == "OPTIONS":
            return await call_next(request)

        if request.headers.get(PASSCODE_HEADER) != passcode:
            return JSONResponse(status_code=401, content={"detail": "잘못된 접근 코드입니다."})

        return await call_next(request)
