import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Serviço de SMS via TextBee (https://textbee.dev)
 *
 * Setup:
 * 1. Instalar a app TextBee no Android
 * 2. Criar conta em https://textbee.dev
 * 3. Conceder permissão de SMS na app
 * 4. Copiar API Key e Device ID do painel
 * 5. Adicionar ao .env:
 *    TEXTBEE_API_KEY=tua_api_key
 *    TEXTBEE_DEVICE_ID=tua_device_id
 */
@Injectable()
export class SmsGatewayService {
  private readonly logger = new Logger(SmsGatewayService.name);
  private readonly apiKey: string;
  private readonly deviceId: string;
  private readonly baseUrl = 'https://api.textbee.dev/api/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TEXTBEE_API_KEY', '');
    this.deviceId = this.configService.get<string>('TEXTBEE_DEVICE_ID', '');
  }

  get isConfigured(): boolean {
    return !!(this.apiKey && this.deviceId);
  }

  async enviarSms(telefone: string, mensagem: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('TextBee não configurado. SMS não enviado.');
      return false;
    }

    const numero = this.formatarTelefone(telefone);

    try {
      const response = await axios.post(
        `${this.baseUrl}/gateway/devices/${this.deviceId}/send-sms`,
        {
          recipients: [numero],
          message: mensagem,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.log(`SMS enviado via TextBee para ${numero}: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Erro TextBee: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
      return false;
    }
  }

  async enviarCodigoTelefone(telefone: string): Promise<{ message: string; codigoTeste?: string }> {
    const tel = telefone.replace(/^\+244/, '').replace(/\s/g, '');
    if (!/^9\d{8}$/.test(tel)) {
      return { message: 'Telefone inválido' };
    }

    const codigo = Math.floor(1000 + Math.random() * 9000).toString();
    const mensagem = `Baza: O teu codigo de verificacao e ${codigo}. Valido por 10 minutos.`;

    const enviado = await this.enviarSms(tel, mensagem);

    if (!enviado) {
      // Em dev, retornar o código para teste mesmo que o SMS não envie
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] SMS falhou, mas retornando código de teste: ${codigo}`);
        return { message: 'Código gerado (SMS não enviado em dev)', codigoTeste: codigo };
      }
      return { message: 'Falha ao enviar SMS' };
    }

    return { message: 'Código enviado por SMS' };
  }

  private formatarTelefone(telefone: string): string {
    let t = telefone.replace(/\s/g, '');
    if (t.startsWith('+244')) return t;
    if (t.startsWith('244')) return `+${t}`;
    return `+244${t}`;
  }
}
