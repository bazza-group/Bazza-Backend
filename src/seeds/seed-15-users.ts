/**
 * Seed script: cria 15 utilizadores variados + pedidos + planos
 * Uso: npx ts-node src/seeds/seed-15-users.ts
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

// Entidades
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Deliver, DeliverStatus, DeliverDisponibilidade } from '../motoqueiros/entities/motoqueiro.entity';
import { Veiculo } from '../motoqueiros/entities/veiculo.entity';
import { Pedido, StatusPedido, TipoPagamento } from '../pedidos/entities/pedido.entity';
import { Plano, TipoPlano, StatusPlano } from '../planos/entities/plano.entity';

const ds = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'bazza',
  entities: [User, Deliver, Veiculo, Pedido, Plano],
  synchronize: true,
});

async function seed() {
  await ds.initialize();
  const userRepo = ds.getRepository(User);
  const deliverRepo = ds.getRepository(Deliver);
  const veiculoRepo = ds.getRepository(Veiculo);
  const pedidoRepo = ds.getRepository(Pedido);
  const planoRepo = ds.getRepository(Plano);

  // Limpar dados existentes (excepto admin)
  await pedidoRepo.delete({});
  await planoRepo.delete({});
  await veiculoRepo.delete({});
  await deliverRepo.delete({});
  await userRepo.delete({ role: UserRole.CLIENT });
  await userRepo.delete({ role: UserRole.DELIVER });

  // 15 utilizadores variados - clientes e motoqueiros com diferentes status
  const users = [
    // CLIENTES (8)
    { nome: 'João', sobrenome: 'Silva', email: 'joao@baza.ao', telefone: '+244912000001', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    { nome: 'Maria', sobrenome: 'Santos', email: 'maria@baza.ao', telefone: '+244912000002', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    { nome: 'Pedro', sobrenome: 'Costa', email: 'pedro@baza.ao', telefone: '+244912000003', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    { nome: 'Ana', sobrenome: 'Ferreira', email: 'ana@baza.ao', telefone: '+244912000004', role: UserRole.CLIENT, status: UserStatus.SUSPENDED },
    { nome: 'Carlos', sobrenome: 'Dias', email: 'carlos@baza.ao', telefone: '+244912000005', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    { nome: 'Sofia', sobrenome: 'Lopes', email: 'sofia@baza.ao', telefone: '+244912000006', role: UserRole.CLIENT, status: UserStatus.PENDING },
    { nome: 'Miguel', sobrenome: 'Ramos', email: 'miguel@baza.ao', telefone: '+244912000007', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    { nome: 'Luisa', sobrenome: 'Amaral', email: 'luisa@baza.ao', telefone: '+244912000008', role: UserRole.CLIENT, status: UserStatus.ACTIVE },
    // MOTOQUEIROS (7)
    { nome: 'António', sobrenome: 'Nunes', email: 'antonio@baza.ao', telefone: '+244912000009', role: UserRole.DELIVER, status: UserStatus.ACTIVE },
    { nome: 'Francisco', sobrenome: 'Tavares', email: 'francisco@baza.ao', telefone: '+244912000010', role: UserRole.DELIVER, status: UserStatus.ACTIVE },
    { nome: 'Rui', sobrenome: 'Pereira', email: 'rui@baza.ao', telefone: '+244912000011', role: UserRole.DELIVER, status: UserStatus.ACTIVE },
    { nome: 'Bruno', sobrenome: 'Martins', email: 'bruno@baza.ao', telefone: '+244912000012', role: UserRole.DELIVER, status: UserStatus.SUSPENDED },
    { nome: 'Paulo', sobrenome: 'Gomes', email: 'paulo@baza.ao', telefone: '+244912000013', role: UserRole.DELIVER, status: UserStatus.ACTIVE },
    { nome: 'Diogo', sobrenome: 'Henriques', email: 'diogo@baza.ao', telefone: '+244912000014', role: UserRole.DELIVER, status: UserStatus.PENDING },
    { nome: 'Tiago', sobrenome: 'Vieira', email: 'tiago@baza.ao', telefone: '+244912000015', role: UserRole.DELIVER, status: UserStatus.ACTIVE },
  ];

  const savedUsers: User[] = [];
  for (const u of users) {
    const user = userRepo.create({
      ...u,
      firebaseUid: `seed_${u.telefone}`,
      telefoneVerificado: true,
      dataNascimento: new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      numeroDocumento: `000${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}BA`,
      tipoDocumento: 'BI',
    });
    const saved = await userRepo.save(user);
    savedUsers.push(saved);
    console.log(`✓ ${saved.role} ${saved.nome} ${saved.sobrenome} [${saved.status}]`);
  }

  // Criar Deliver para cada motoqueiro
  const marcas = ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'TVS'];
  const modelos = ['CG 160', 'Factor 150', 'GN 125', 'Ninja 400', 'Apache 160'];
  const cores = ['Vermelho', 'Azul', 'Preto', 'Branco', 'Verde'];
  const motoqueiros = savedUsers.filter(u => u.role === UserRole.DELIVER);

  for (let i = 0; i < motoqueiros.length; i++) {
    const u = motoqueiros[i];
    // Status do deliver baseado no user: suspended -> suspenso, pending -> pendente, else activo
    let deliverStatus: DeliverStatus;
    if (u.status === UserStatus.SUSPENDED) deliverStatus = DeliverStatus.SUSPENSO;
    else if (u.status === UserStatus.PENDING) deliverStatus = DeliverStatus.PENDENTE;
    else deliverStatus = DeliverStatus.ACTIVO;

    // Disponibilidade variada: online, offline, ocupado
    const disponibilidades = [DeliverDisponibilidade.ONLINE, DeliverDisponibilidade.OFFLINE, DeliverDisponibilidade.OCUPADO];
    const disponibilidade = disponibilidades[i % disponibilidades.length];

    const deliver: any = deliverRepo.create({
      userId: u.id,
      numeroCartaConducao: `LC${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      validadeCartaConducao: new Date(2027, 6, 15),
      morada: `Rua ${i + 1}, Luanda`,
      status: deliverStatus,
      statusDisponibilidade: disponibilidade,
      classificacaoMedia: parseFloat((3 + Math.random() * 2).toFixed(2)),
      totalAvaliacoes: Math.floor(Math.random() * 50) + 5,
      aprovadoEm: deliverStatus === DeliverStatus.ACTIVO ? new Date() : undefined,
    });
    const savedDeliver: any = await deliverRepo.save(deliver);

    // Veículo
    const v = veiculoRepo.create({
      motoqueiroId: savedDeliver.id,
      marca: marcas[i % marcas.length],
      modelo: modelos[i % modelos.length],
      cor: cores[i % cores.length],
      ano: 2020 + (i % 4),
      matricula: `LD-${(1000 + i).toString()}-AB`,
      ativo: true,
    });
    await veiculoRepo.save(v);
    console.log(`  → Veículo: ${v.marca} ${v.modelo} ${v.cor} (${v.matricula}) [${disponibilidade}]`);
  }

  // Planos variados - diário, semanal, mensal com diferentes status
  const tiposPlanos: TipoPlano[] = [TipoPlano.DIARIO, TipoPlano.SEMANAL, TipoPlano.MENSAL];
  const statusPlanos: StatusPlano[] = [StatusPlano.ATIVO, StatusPlano.PENDENTE, StatusPlano.EXPIRADO, StatusPlano.REJEITADO];
  const clientes = savedUsers.filter(u => u.role === UserRole.CLIENT);

  for (let i = 0; i < clientes.length; i++) {
    const tipo = tiposPlanos[i % tiposPlanos.length];
    const status = statusPlanos[i % statusPlanos.length];
    const valor = tipo === TipoPlano.DIARIO ? 500 : tipo === TipoPlano.SEMANAL ? 2500 : 8000;
    const plano: any = planoRepo.create({
      userId: clientes[i].id,
      tipo,
      status,
      valor,
      ativoEm: status === StatusPlano.ATIVO ? new Date() : undefined,
      expiraEm: status === StatusPlano.ATIVO ? new Date(Date.now() + 30 * 86400000) : undefined,
    });
    const savedPlano: any = await planoRepo.save(plano);

    // Actualizar user com plano activo
    if (status === StatusPlano.ATIVO) {
      await userRepo.update(clientes[i].id, { planoAtivo: tipo, planoExpiraEm: savedPlano.expiraEm });
    }
    console.log(`  → Plano: ${clientes[i].nome} - ${tipo} [${status}] ${valor} Kz`);
  }

  // Pedidos variados - todos os status possíveis
  const enderecosRecolha = [
    'Centro Comercial Belas, Luanda',
    'Shoprite Kinaxixi, Luanda',
    'Kero Patriota, Luanda',
    'Supermercado Kibabo, Luanda',
    'Game Belas, Luanda',
  ];
  const enderecosEntrega = [
    'Rua Amílcar Cabral 45, Maianga',
    'Av. 4 de Fevereiro 123, Ingombotas',
    'Rua da Missão 67, Baixa de Luanda',
    'Largo do Kinaxixi 8, Kinaxixi',
    'Rua Rainha Ginga 34, Maculusso',
  ];
  const tiposEncomenda = ['documento', 'encomenda', 'comida'];
  const tiposPagamento = [TipoPagamento.NUMERARIO, TipoPagamento.CARTEIRA, TipoPagamento.STRIPE];

  // Criar 18 pedidos com todos os status
  const todosStatus = [
    StatusPedido.ENTREGUE, StatusPedido.ENTREGUE, StatusPedido.ENTREGUE, StatusPedido.ENTREGUE,
    StatusPedido.CANCELADO, StatusPedido.CANCELADO, StatusPedido.CANCELADO,
    StatusPedido.ENTREGANDO, StatusPedido.ENTREGANDO,
    StatusPedido.A_CAMINHO_RECOLHA, StatusPedido.A_CAMINHO_RECOLHA,
    StatusPedido.RECOLHIDO,
    StatusPedido.MOTOQUEIRO_ATRIBUIDO,
    StatusPedido.A_PROCURAR_MOTOQUEIRO, StatusPedido.A_PROCURAR_MOTOQUEIRO,
    StatusPedido.EM_PAUSA,
  ];

  for (let i = 0; i < todosStatus.length; i++) {
    const cliente = clientes[i % clientes.length];
    const motoqueiro = motoqueiros[i % motoqueiros.length];
    const status = todosStatus[i];
    const diasAtras = Math.floor(Math.random() * 30);

    const pedido: any = pedidoRepo.create({
      numeroPedido: `BZ-${(1000 + i).toString()}`,
      clienteId: cliente.id,
      motoqueiroId: status !== StatusPedido.A_PROCURAR_MOTOQUEIRO ? motoqueiro.id : undefined,
      origemLatitude: -8.8390 + (Math.random() - 0.5) * 0.1,
      origemLongitude: 13.2894 + (Math.random() - 0.5) * 0.1,
      origemEndereco: enderecosRecolha[i % enderecosRecolha.length],
      destinoLatitude: -8.8390 + (Math.random() - 0.5) * 0.1,
      destinoLongitude: 13.2894 + (Math.random() - 0.5) * 0.1,
      destinoEndereco: enderecosEntrega[i % enderecosEntrega.length],
      distanciaKm: parseFloat((Math.random() * 15 + 1).toFixed(2)),
      tipo: tiposEncomenda[i % tiposEncomenda.length],
      valorEntrega: parseFloat((500 + Math.random() * 2000).toFixed(2)),
      tipoPagamento: tiposPagamento[i % tiposPagamento.length],
      status,
      criadoEm: new Date(Date.now() - diasAtras * 86400000),
      canceladoEm: status === StatusPedido.CANCELADO ? new Date(Date.now() - (diasAtras - 1) * 86400000) : undefined,
      motivoCancelamento: status === StatusPedido.CANCELADO ? 'Cancelado pelo cliente' : undefined,
      entregueEm: status === StatusPedido.ENTREGUE ? new Date(Date.now() - (diasAtras - 1) * 86400000) : undefined,
      atribuidoEm: status !== StatusPedido.A_PROCURAR_MOTOQUEIRO ? new Date(Date.now() - diasAtras * 86400000) : undefined,
      recolhidoEm: [StatusPedido.RECOLHIDO, StatusPedido.ENTREGANDO, StatusPedido.ENTREGUE].includes(status) ? new Date(Date.now() - diasAtras * 86400000) : undefined,
    });
    await pedidoRepo.save(pedido);
    console.log(`  → Pedido: ${pedido.numeroPedido} [${status}] - ${cliente.nome} → ${pedido.destinoEndereco}`);
  }

  console.log('\n✓ Seed completo: 15 utilizadores, 7 motos, 8 planos, 16 pedidos criados');
  await ds.destroy();
}

seed().catch(err => { console.error(err); process.exit(1); });
