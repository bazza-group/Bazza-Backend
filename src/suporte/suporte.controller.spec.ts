import { Test, TestingModule } from '@nestjs/testing';
import { SuporteController } from './suporte.controller';
import { SuporteService } from './suporte.service';

describe('SuporteController', () => {
  let controller: SuporteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuporteController],
      providers: [SuporteService],
    }).compile();

    controller = module.get<SuporteController>(SuporteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
