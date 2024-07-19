import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const controllerName = context.getClass().name;

    this.logRequestStart(method, url, controllerName);

    return next
      .handle()
      .pipe(tap(() => this.logRequestEnd(method, url, controllerName, now)));
  }

  private logRequestStart(
    method: string,
    url: string,
    controllerName: string,
  ): void {
    this.logger.log(`[${method} | Start] ${controllerName} {${url}}`);
  }

  private logRequestEnd(
    method: string,
    url: string,
    controllerName: string,
    startTime: number,
  ): void {
    const timeTaken = Date.now() - startTime;
    this.logger.log(
      `[${method} | End] ${controllerName} {${url}}: (Time taken: ${timeTaken} ms)`,
    );
  }
}
