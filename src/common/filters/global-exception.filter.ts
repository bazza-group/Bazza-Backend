import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatGateway } from '../../chat/chat.gateway';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly chatGateway: ChatGateway) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Erro interno do servidor';

    // Apenas emitir socket para erros 5xx (erros inesperados do servidor)
    if (status >= 500) {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : '';

      this.logger.error(`[${request.method}] ${request.url} — ${errorMessage}`, errorStack);

      try {
        this.chatGateway.server.to('role_admin').emit('admin:server_error', {
          method: request.method,
          path: request.url,
          status,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    }

    response.status(status).json(
      typeof message === 'object'
        ? message
        : { statusCode: status, message },
    );
  }
}
