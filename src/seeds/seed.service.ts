import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Deliver, DeliverStatus, DeliverDisponibilidade } from '../motoqueiros/entities/motoqueiro.entity';
import { Veiculo } from '../motoqueiros/entities/veiculo.entity';
import { Pedido, StatusPedido, TipoPagamento } from '../pedidos/entities/pedido.entity';
import { Plano, TipoPlano, StatusPlano } from '../planos/entities/plano.entity';
import { Upload, TipoUpload } from '../uploads/entities/upload.entity';

@Injectable()
export class SeedService {
  private readonly log = new Logger('Seed');

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Deliver) private deliverRepo: Repository<Deliver>,
    @InjectRepository(Veiculo) private veiculoRepo: Repository<Veiculo>,
    @InjectRepository(Pedido) private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Plano) private planoRepo: Repository<Plano>,
    @InjectRepository(Upload) private uploadRepo: Repository<Upload>,
  ) {}

  async run() {
    const clientCount = await this.userRepo.count({ where: { role: UserRole.CLIENT } });
    const deliverCount = await this.userRepo.count({ where: { role: UserRole.DELIVER } });

    // Verificar se já existem utilizadores suficientes
    if (clientCount >= 8 && deliverCount >= 7) {
      this.log.log('Seed já executado — utilizadores suficientes');

      // Garantir que delivers existentes têm documentos
      await this.garantirDocumentosDeliver();

      return { message: 'Seed já executado', clients: clientCount, delivers: deliverCount };
    }

    // Imagens dummy (1x1 PNG pixel) para documentos
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    const docTipos = [
      TipoUpload.DOCUMENTO_BI_FRENTE,
      TipoUpload.DOCUMENTO_BI_VERSO,
      TipoUpload.DOCUMENTO_CARTA_FRENTE,
      TipoUpload.DOCUMENTO_CARTA_VERSO,
      TipoUpload.FOTO_VEICULO,
    ];

    // Definições de novos utilizadores para adicionar (não apagar existentes)
    const novosClientes = [
      { nome: 'João', sobrenome: 'Silva', email: 'joao@baza.ao', telefone: '+244912000001', status: UserStatus.ACTIVE },
      { nome: 'Maria', sobrenome: 'Santos', email: 'maria@baza.ao', telefone: '+244912000002', status: UserStatus.ACTIVE },
      { nome: 'Pedro', sobrenome: 'Costa', email: 'pedro@baza.ao', telefone: '+244912000003', status: UserStatus.ACTIVE },
      { nome: 'Ana', sobrenome: 'Ferreira', email: 'ana@baza.ao', telefone: '+244912000004', status: UserStatus.SUSPENDED },
      { nome: 'Carlos', sobrenome: 'Dias', email: 'carlos@baza.ao', telefone: '+244912000005', status: UserStatus.ACTIVE },
      { nome: 'Sofia', sobrenome: 'Lopes', email: 'sofia@baza.ao', telefone: '+244912000006', status: UserStatus.PENDING },
      { nome: 'Miguel', sobrenome: 'Ramos', email: 'miguel@baza.ao', telefone: '+244912000007', status: UserStatus.ACTIVE },
      { nome: 'Luisa', sobrenome: 'Amaral', email: 'luisa@baza.ao', telefone: '+244912000008', status: UserStatus.ACTIVE },
    ];

    const novosDelivers = [
      { nome: 'António', sobrenome: 'Nunes', email: 'antonio@baza.ao', telefone: '+244912000009', status: UserStatus.ACTIVE },
      { nome: 'Francisco', sobrenome: 'Tavares', email: 'francisco@baza.ao', telefone: '+244912000010', status: UserStatus.ACTIVE },
      { nome: 'Rui', sobrenome: 'Pereira', email: 'rui@baza.ao', telefone: '+244912000011', status: UserStatus.ACTIVE },
      { nome: 'Bruno', sobrenome: 'Martins', email: 'bruno@baza.ao', telefone: '+244912000012', status: UserStatus.SUSPENDED },
      { nome: 'Paulo', sobrenome: 'Gomes', email: 'paulo@baza.ao', telefone: '+244912000013', status: UserStatus.ACTIVE },
      { nome: 'Diogo', sobrenome: 'Henriques', email: 'diogo@baza.ao', telefone: '+244912000014', status: UserStatus.PENDING },
      { nome: 'Tiago', sobrenome: 'Vieira', email: 'tiago@baza.ao', telefone: '+244912000015', status: UserStatus.ACTIVE },
    ];

    // Criar clientes que não existem
    const savedClients: User[] = [];
    const clientesExistentes = await this.userRepo.find({ where: { role: UserRole.CLIENT } });
    savedClients.push(...clientesExistentes);

    const clientesNecessarios = 8 - clientCount;
    for (let i = 0; i < Math.min(clientesNecessarios, novosClientes.length); i++) {
      const def = novosClientes[i];
      const existing = await this.userRepo.findOne({ where: { telefone: def.telefone } });
      if (existing) {
        savedClients.push(existing);
        continue;
      }
      const user: any = this.userRepo.create({
        ...def,
        role: UserRole.CLIENT,
        firebaseUid: `seed_${def.telefone}`,
        telefoneVerificado: true,
        dataNascimento: new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        numeroDocumento: `000${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}BA`,
        tipoDocumento: 'BI',
      });
      savedClients.push(await this.userRepo.save(user));
      this.log.log(`✓ CLIENT ${user.nome} [${user.status}]`);
    }

    // Criar delivers que não existem
    const deliversExistentes = await this.deliverRepo.find({ relations: ['user'] });
    const marcas = ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'TVS'];
    const modelos = ['CG 160', 'Factor 150', 'GN 125', 'Ninja 400', 'Apache 160'];
    const cores = ['Vermelho', 'Azul', 'Preto', 'Branco', 'Verde'];
    const disponibilidades = [DeliverDisponibilidade.ONLINE, DeliverDisponibilidade.OFFLINE, DeliverDisponibilidade.OCUPADO];

    const deliversNecessarios = 7 - deliverCount;
    for (let i = 0; i < Math.min(deliversNecessarios, novosDelivers.length); i++) {
      const def = novosDelivers[i];
      const existing = await this.userRepo.findOne({ where: { telefone: def.telefone } });
      if (existing) continue;

      const user: any = await this.userRepo.save(this.userRepo.create({
        ...def,
        role: UserRole.DELIVER,
        firebaseUid: `seed_${def.telefone}`,
        telefoneVerificado: true,
        dataNascimento: new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        numeroDocumento: `000${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}BA`,
        tipoDocumento: 'BI',
      } as any));

      let deliverStatus: DeliverStatus;
      if (user.status === UserStatus.SUSPENDED) deliverStatus = DeliverStatus.SUSPENSO;
      else if (user.status === UserStatus.PENDING) deliverStatus = DeliverStatus.PENDENTE;
      else deliverStatus = DeliverStatus.ACTIVO;

      const disponibilidade = disponibilidades[i % disponibilidades.length];
      const saved: any = await this.deliverRepo.save(this.deliverRepo.create({
        userId: user.id,
        numeroCartaConducao: `LC${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
        validadeCartaConducao: new Date(2027, 6, 15),
        morada: `Rua ${i + 1}, Luanda`,
        status: deliverStatus,
        statusDisponibilidade: disponibilidade,
        classificacaoMedia: parseFloat((3 + Math.random() * 2).toFixed(2)),
        totalAvaliacoes: Math.floor(Math.random() * 50) + 5,
        aprovadoEm: deliverStatus === DeliverStatus.ACTIVO ? new Date() : undefined,
      } as any));

      await this.veiculoRepo.save(this.veiculoRepo.create({
        motoqueiroId: saved.id,
        marca: marcas[i % marcas.length],
        modelo: modelos[i % modelos.length],
        cor: cores[i % cores.length],
        ano: 2020 + (i % 4),
        matricula: `LD-${(1000 + i).toString()}-AB`,
        ativo: true,
      }));

      // Criar 5 documentos (sem status — o motoqueiro é aprovado como um todo)
      for (const tipo of docTipos) {
        await this.uploadRepo.save(this.uploadRepo.create({
          userId: user.id,
          tipo,
          nomeOriginal: `${tipo}_${user.nome}.png`,
          mimeType: 'image/png',
          ficheiro: dummyPng,
          tamanho: dummyPng.length,
        } as any));
      }

      this.log.log(`  → DELIVER: ${user.nome} [${deliverStatus}] [${disponibilidade}] + 5 docs`);
    }

    // Garantir que TODOS os delivers (incluindo existentes) têm documentos
    await this.garantirDocumentosDeliver();

    // Planos para clientes que não têm
    const tiposPlanos: TipoPlano[] = [TipoPlano.DIARIO, TipoPlano.SEMANAL, TipoPlano.MENSAL];
    const statusPlanos: StatusPlano[] = [StatusPlano.ATIVO, StatusPlano.PENDENTE, StatusPlano.EXPIRADO, StatusPlano.REJEITADO];

    for (let i = 0; i < savedClients.length; i++) {
      const existingPlan = await this.planoRepo.findOne({ where: { userId: savedClients[i].id } });
      if (existingPlan) continue;

      const tipo = tiposPlanos[i % tiposPlanos.length];
      const status = statusPlanos[i % statusPlanos.length];
      const valor = tipo === TipoPlano.DIARIO ? 500 : tipo === TipoPlano.SEMANAL ? 2500 : 8000;
      const plano: any = await this.planoRepo.save(this.planoRepo.create({
        userId: savedClients[i].id,
        tipo,
        status,
        valor,
        ativoEm: status === StatusPlano.ATIVO ? new Date() : undefined,
        expiraEm: status === StatusPlano.ATIVO ? new Date(Date.now() + 30 * 86400000) : undefined,
      } as any));
      if (status === StatusPlano.ATIVO) {
        await this.userRepo.update(savedClients[i].id, { planoAtivo: tipo, planoExpiraEm: plano.expiraEm });
      }
      this.log.log(`  → Plano: ${savedClients[i].nome} — ${tipo} [${status}]`);
    }

    // Pedidos de teste
    const existingOrders = await this.pedidoRepo.count();
    if (existingOrders < 16) {
      const todosStatus: StatusPedido[] = [
        StatusPedido.ENTREGUE, StatusPedido.ENTREGUE, StatusPedido.ENTREGUE, StatusPedido.ENTREGUE,
        StatusPedido.CANCELADO, StatusPedido.CANCELADO, StatusPedido.CANCELADO,
        StatusPedido.ENTREGANDO, StatusPedido.ENTREGANDO,
        StatusPedido.A_CAMINHO_RECOLHA, StatusPedido.A_CAMINHO_RECOLHA,
        StatusPedido.RECOLHIDO,
        StatusPedido.MOTOQUEIRO_ATRIBUIDO,
        StatusPedido.A_PROCURAR_MOTOQUEIRO, StatusPedido.A_PROCURAR_MOTOQUEIRO,
        StatusPedido.EM_PAUSA,
      ];
      const enderecos = [
        ['Centro Comercial Belas', 'Rua Amílcar Cabral 45, Maianga'],
        ['Shoprite Kinaxixi', 'Av. 4 de Fevereiro 123, Ingombotas'],
        ['Kero Patriota', 'Rua da Missão 67, Baixa de Luanda'],
        ['Supermercado Kibabo', 'Largo do Kinaxixi 8, Kinaxixi'],
        ['Game Belas', 'Rua Rainha Ginga 34, Maculusso'],
      ];

      const allDelivers = await this.deliverRepo.find({ relations: ['user'] });

      for (let i = existingOrders; i < todosStatus.length; i++) {
        const cliente = savedClients[i % savedClients.length];
        const motoqueiro = allDelivers[i % allDelivers.length];
        const status = todosStatus[i];
        const [rec, ent] = enderecos[i % enderecos.length];
        const diasAtras = Math.floor(Math.random() * 30);

        await this.pedidoRepo.save(this.pedidoRepo.create({
          numeroPedido: `BZ-${(1000 + i).toString()}`,
          clienteId: cliente.id,
          motoqueiroId: status !== StatusPedido.A_PROCURAR_MOTOQUEIRO ? motoqueiro?.id : undefined,
          origemLatitude: -8.8390 + (Math.random() - 0.5) * 0.1,
          origemLongitude: 13.2894 + (Math.random() - 0.5) * 0.1,
          origemEndereco: rec,
          destinoLatitude: -8.8390 + (Math.random() - 0.5) * 0.1,
          destinoLongitude: 13.2894 + (Math.random() - 0.5) * 0.1,
          destinoEndereco: ent,
          distanciaKm: parseFloat((Math.random() * 15 + 1).toFixed(2)),
          tipo: ['documento', 'encomenda', 'comida'][i % 3],
          valorEntrega: parseFloat((500 + Math.random() * 2000).toFixed(2)),
          tipoPagamento: [TipoPagamento.NUMERARIO, TipoPagamento.CARTEIRA, TipoPagamento.STRIPE][i % 3],
          status,
          criadoEm: new Date(Date.now() - diasAtras * 86400000),
          canceladoEm: status === StatusPedido.CANCELADO ? new Date() : undefined,
          motivoCancelamento: status === StatusPedido.CANCELADO ? 'Cancelado pelo cliente' : undefined,
          entregueEm: status === StatusPedido.ENTREGUE ? new Date() : undefined,
          atribuidoEm: status !== StatusPedido.A_PROCURAR_MOTOQUEIRO ? new Date() : undefined,
          recolhidoEm: [StatusPedido.RECOLHIDO, StatusPedido.ENTREGANDO, StatusPedido.ENTREGUE].includes(status) ? new Date() : undefined,
        } as any));
        this.log.log(`  → Pedido BZ-${1000 + i} [${status}]`);
      }
    }

    // Contagem final
    const totalClients = await this.userRepo.count({ where: { role: UserRole.CLIENT } });
    const totalDelivers = await this.userRepo.count({ where: { role: UserRole.DELIVER } });
    this.log.log(`Seed concluído ✓ — ${totalClients} clientes, ${totalDelivers} delivers`);

    return { message: 'Seed concluído', clients: totalClients, delivers: totalDelivers };
  }

  /**
   * Garantir que todos os delivers têm 5 documentos (uploads).
   * Se um deliver não tem documentos, criar automaticamente.
   */
  private async garantirDocumentosDeliver() {
    const delivers = await this.deliverRepo.find({ relations: ['user'] });
    const docTipos = [
      TipoUpload.DOCUMENTO_BI_FRENTE,
      TipoUpload.DOCUMENTO_BI_VERSO,
      TipoUpload.DOCUMENTO_CARTA_FRENTE,
      TipoUpload.DOCUMENTO_CARTA_VERSO,
      TipoUpload.FOTO_VEICULO,
    ];

    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    for (const deliver of delivers) {
      const uploadCount = await this.uploadRepo.count({ where: { userId: deliver.userId } });
      if (uploadCount >= 5) continue;

      // Criar documentos em falta
      const existingUploads = await this.uploadRepo.find({ where: { userId: deliver.userId } });
      const existingTipos = existingUploads.map(u => u.tipo);

      for (const tipo of docTipos) {
        if (existingTipos.includes(tipo)) continue;

        await this.uploadRepo.save(this.uploadRepo.create({
          userId: deliver.userId,
          tipo,
          nomeOriginal: `${tipo}_${deliver.user?.nome || 'unknown'}.png`,
          mimeType: 'image/png',
          ficheiro: dummyPng,
          tamanho: dummyPng.length,
        } as any));
      }
      this.log.log(`  → Docs adicionados para: ${deliver.user?.nome || deliver.userId}`);
    }
  }
}
