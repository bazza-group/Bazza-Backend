import { Test, TestingModule } from '@nestjs/testing';
import { PrecificacaoController } from './precificacao.controller';
import { PrecificacaoService } from './precificacao.service';

describe('PrecificacaoController', () => {
  let controller: PrecificacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrecificacaoController],
      providers: [PrecificacaoService],
    }).compile();

    controller = module.get<PrecificacaoController>(PrecificacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
