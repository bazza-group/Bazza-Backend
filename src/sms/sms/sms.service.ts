import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

/**
 * Serviço de envio de SMS — InfiniReach Cloud API.
 *
 * API: https://api.infinireach.io/api/v1/messages
 * Auth: X-API-Key header
 * Payload: { deviceId, to, message, channel: 'sms', e164From }
 * Tempo de resposta: ~47 segundos
 *
 * Configuração via .env:
 *   INFINIREACH_API_KEY        — Chave de API InfiniReach
 *   INFINIREACH_DEVICE_ID      — ID do dispositivo InfiniReach
 *   INFINIREACH_SENDER_NUMBER  — Número do SIM do gateway InfiniReach
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly infiniUrl = 'https://api.infinireach.io/api/v1';
  private readonly infiniKey: string;
  private readonly infiniDevice: string;
  private readonly infiniSender: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.infiniKey = this.configService.get<string>('INFINIREACH_API_KEY', '');
    this.infiniDevice = this.configService.get<string>('INFINIREACH_DEVICE_ID', '');
    this.infiniSender = this.configService.get<string>('INFINIREACH_SENDER_NUMBER', '+244958651191');
  }

  async enviarSms(telefone: string, mensagem: string): Promise<boolean> {
    const to = this.formatarTelefone(telefone);

    if (!this.infiniKey || !this.infiniDevice) {
      this.logger.error('InfiniReach não configurado — verifica INFINIREACH_API_KEY e INFINIREACH_DEVICE_ID no .env');
      throw new InternalServerErrorException('SMS não configurado.');
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.infiniUrl}/messages`,
          {
            deviceId: this.infiniDevice,
            to,
            message: mensagem,
            channel: 'sms',
            e164From: this.infiniSender,
          },
          {
            headers: { 'X-API-Key': this.infiniKey, 'Content-Type': 'application/json' },
            timeout: 60000,
          },
        ),
      );
      this.logger.log(`SMS enviado via InfiniReach para ${to}: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error: any) {
      this.logger.error(`InfiniReach falhou para ${to}: ${error.response?.data?.message || error.message}`);
      throw new InternalServerErrorException(
        'Não foi possível enviar o SMS. Verifica se o telemóvel gateway está ligado.',
      );
    }
  }

  async verificarConexao(): Promise<boolean> {
    try {
      await lastValueFrom(
        this.httpService.get(`${this.infiniUrl}/devices`, {
          headers: { 'X-API-Key': this.infiniKey },
          timeout: 5000,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private formatarTelefone(telefone: string): string {
    let t = telefone.replace(/\s/g, '');
    if (t.startsWith('+244')) return t;
    if (t.startsWith('244')) return `+${t}`;
    return `+244${t}`;
  }
}
