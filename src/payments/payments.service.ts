import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Importação direta do construtor para evitar o erro de namespace/propriedade
const Stripe = require('stripe');

@Injectable()
export class PaymentsService {
  // Tipamos como 'any' ou 'InstanceType<any>' para saltar a restrição rigorosa do node16
  private stripe: any;

  constructor(private config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY não está configurada');
    }

    // Instanciação via require (mais segura para CommonJS no NestJS)
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16', // Versão estável
    });
  }

  async criarPaymentIntent(valor: number, clienteEmail: string, pedidoId: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(valor),
      currency: 'aoa',
      receipt_email: clienteEmail,
      metadata: { pedidoId },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async verificarPagamento(paymentIntentId: string): Promise<boolean> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return intent.status === 'succeeded';
  }

  async reembolsar(paymentIntentId: string, valor?: number) {
    await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: valor,
    });
    return { message: 'Reembolso processado' };
  }
}